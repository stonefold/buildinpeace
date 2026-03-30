import supabase, { isSupabaseConfigured } from '../supabase';
import { emptyProject, emptyWorkspace } from '../data/workspaceDefaults';

const ADMIN_DOC_TYPES = new Set(['Offres', 'Factures', 'Contrats', 'Assurances', 'Avancement']);

const roleLabelMap = {
  owner: 'Gestionnaire',
  admin: 'Gestionnaire',
  manager: 'Gestionnaire',
  member: 'Entrepreneur',
  guest: 'Client',
  project_manager: 'Gestionnaire',
  contractor: 'Entrepreneur',
  architect: 'Architecte',
  worker: 'Ouvrier',
  client: 'Client',
  subcontractor: 'Sous-traitant',
};

const taskStatusMap = {
  todo: 'A faire',
  in_progress: 'En cours',
  blocked: 'En cours',
  review: 'En cours',
  done: 'Terminee',
  archived: 'Terminee',
};

const taskPriorityMap = {
  low: 'Pas urgent',
  medium: 'Pas urgent',
  high: 'Urgent',
  urgent: 'Urgent',
};

const reverseTaskStatusMap = {
  'A faire': 'todo',
  'En cours': 'in_progress',
  'Terminee': 'done',
};

const reverseTaskPriorityMap = {
  Basse: 'low',
  Moyenne: 'medium',
  Haute: 'high',
  'Pas urgent': 'medium',
  Urgent: 'high',
};

const roleToDbMap = {
  Gestionnaire: 'project_manager',
  Entrepreneur: 'contractor',
  Architecte: 'architect',
  Client: 'client',
  Ouvrier: 'worker',
  'Sous-traitant': 'subcontractor',
};

const normalizePermissions = (permissions) => (permissions && typeof permissions === 'object' && !Array.isArray(permissions) ?permissions : {});

const fileBucket = 'workspace-assets';

const ensureClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase n'est pas configure.");
  }
};

const unique = (items) => [...new Set(items.filter(Boolean))];
const formatDate = (value) => (value ?new Date(value).toISOString().slice(0, 10) : '');

const formatBudget = (amount, currency = 'EUR') => {
  if (amount === null || typeof amount === 'undefined') return 'A definir';
  try {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (_error) {
    return `${amount} ${currency}`;
  }
};

const slugify = (value) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

const createSignedUrl = async (path) => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(fileBucket).createSignedUrl(path, 3600);
  if (error) {
    console.error('Erreur signature URL Storage:', error);
    return null;
  }
  return data?.signedUrl ?? null;
};

const uploadFile = async ({ file, folder }) => {
  if (!file) return null;
  const extension = file.name.includes('.') ?file.name.split('.').pop() : 'bin';
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(fileBucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return {
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size || 0,
    signedUrl: await createSignedUrl(path),
  };
};

const getCurrentUser = async () => {
  ensureClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user ?? null;
};

export const bootstrapWorkspace = async () => {
  ensureClient();
  const { error } = await supabase.rpc('bootstrap_workspace');
  if (error) throw error;
};

const fetchProfile = async (userId) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
};

const fetchOrganizationMemberships = async (userId) => {
  const { data, error } = await supabase
    .from('organization_members')
    .select('id, organization_id, role, status, organizations(id, name, slug)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

const fetchProjects = async (organizationIds) => {
  if (!organizationIds.length) return [];
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .in('organization_id', organizationIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

const fetchProfilesByIds = async (userIds) => {
  const ids = unique(userIds);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, company_name, email, avatar_url')
    .in('id', ids);
  if (error) throw error;
  return data ?? [];
};

const fetchProjectMembers = async (projectIds) => {
  if (!projectIds.length) return [];
  const { data, error } = await supabase
    .from('project_members')
    .select('id, project_id, user_id, display_name, email, company_name, role, status, permissions, created_at')
    .in('project_id', projectIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

const fetchProjectSections = async (projectIds) => {
  if (!projectIds.length) return [];
  const { data, error } = await supabase
    .from('project_sections')
    .select('*')
    .in('project_id', projectIds)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

const fetchTasks = async (organizationIds, projectIds, userId) => {
  if (!organizationIds.length) return [];
  const projectFilter = projectIds.join(',') || '00000000-0000-0000-0000-000000000000';
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .in('organization_id', organizationIds)
    .or(`created_by.eq.${userId},project_id.in.(${projectFilter})`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

const fetchTaskAssignees = async (taskIds) => {
  if (!taskIds.length) return [];
  const { data, error } = await supabase
    .from('task_assignees')
    .select('task_id, user_id, display_name')
    .in('task_id', taskIds);
  if (error) throw error;
  return data ?? [];
};

const fetchDocuments = async (projectIds) => {
  if (!projectIds.length) return [];
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

const fetchPlans = async (projectIds) => {
  if (!projectIds.length) return { plans: [], versions: [] };
  const [{ data: plans, error: plansError }, { data: versions, error: versionsError }] = await Promise.all([
    supabase.from('plans').select('*').in('project_id', projectIds).order('updated_at', { ascending: false }),
    supabase.from('plan_versions').select('*').order('created_at', { ascending: false }),
  ]);
  if (plansError) throw plansError;
  if (versionsError) throw versionsError;
  return { plans: plans ?? [], versions: versions ?? [] };
};

const fetchConversations = async (projectIds, userId) => {
  if (!projectIds.length) return { conversations: [], members: [], messages: [] };
  const { data: ownMemberships, error: ownMembershipsError } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);
  if (ownMembershipsError) throw ownMembershipsError;

  const ownIds = (ownMemberships ?? []).map((item) => item.conversation_id);
  const projectFilter = projectIds.join(',') || '00000000-0000-0000-0000-000000000000';
  const conversationFilter = ownIds.length
    ?`project_id.in.(${projectFilter}),id.in.(${ownIds.join(',')})`
    : `project_id.in.(${projectFilter})`;

  const { data: conversations, error: conversationError } = await supabase
    .from('conversations')
    .select('*')
    .or(conversationFilter)
    .order('updated_at', { ascending: false });
  if (conversationError) throw conversationError;

  const conversationIds = (conversations ?? []).map((item) => item.id);
  if (!conversationIds.length) return { conversations: [], members: [], messages: [] };

  const [membersResponse, messagesResponse] = await Promise.all([
    supabase
      .from('conversation_members')
      .select('conversation_id, user_id, last_read_at')
      .in('conversation_id', conversationIds),
    supabase.from('messages').select('*').in('conversation_id', conversationIds).order('created_at', { ascending: true }),
  ]);

  if (membersResponse.error) throw membersResponse.error;
  if (messagesResponse.error) throw messagesResponse.error;

  return {
    conversations: conversations ?? [],
    members: membersResponse.data ?? [],
    messages: messagesResponse.data ?? [],
  };
};

const fetchActivity = async (projectIds) => {
  if (!projectIds.length) return [];
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
};

const fetchProjectInvitations = async (email) => {
  if (!email) return [];
  const { data, error } = await supabase
    .from('project_invitations')
    .select('id, project_id, project_name, email, role, status, created_at, responded_at, projects(id, name, site_label, client_name)')
    .ilike('email', email)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

const mapMessageToUi = async (message, currentUserId) => {
  let attachment = null;
  if (message.attachment_storage_path) {
    attachment = {
      name: message.attachment_file_name || 'Piece jointe',
      mimeType: message.attachment_mime_type,
      sizeLabel: message.attachment_file_size ?`${Math.max(1, Math.round(message.attachment_file_size / 1024))} Ko` : '-',
      url: await createSignedUrl(message.attachment_storage_path),
      kind: message.attachment_mime_type?.startsWith('image/') ? 'image' : 'file',
    };
  }

  return {
    id: message.id,
    author: message.sender_name || 'Utilisateur',
    text: message.body || (attachment ?`${attachment.kind === 'image' ? 'Photo' : 'Fichier'} envoye` : ''),
    time: new Date(message.created_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
    own: message.sender_id === currentUserId,
    status: 'Envoye',
    attachment,
  };
};

const getMemberDisplayName = (member) =>
  member?.profiles?.display_name || member?.display_name || member?.email || 'Intervenant';

const mapWorkspace = async (payload) => {
  const {
    profile,
    memberships,
    projects,
    projectMembers,
    sections,
    tasks,
    taskAssignees,
    documents,
    plans,
    planVersions,
    conversations,
    conversationMembers,
    messages,
    activity,
    invitations,
  } = payload;

  const organizationMembership = memberships[0] ?? null;
  const currentUserId = profile.id;
  const currentUserName = profile.display_name || profile.email || 'Utilisateur';
  const currentUserRole =
    roleLabelMap[organizationMembership?.role] ||
    roleLabelMap[projectMembers.find((item) => item.user_id === currentUserId)?.role] ||
    'Gestionnaire';

  const sectionsByProject = sections.reduce((accumulator, section) => {
    accumulator[section.project_id] = accumulator[section.project_id] ?? [];
    accumulator[section.project_id].push(section);
    return accumulator;
  }, {});

  const membersByProject = projectMembers.reduce((accumulator, member) => {
    accumulator[member.project_id] = accumulator[member.project_id] ?? [];
    accumulator[member.project_id].push({
      id: member.id,
      userId: member.user_id,
      name: getMemberDisplayName(member),
      email: member.email || member?.profiles?.email || '',
      company: member.company_name || member?.profiles?.company_name || 'Entreprise a preciser',
      role: roleLabelMap[member.role] || 'Entrepreneur',
      status: member.status === 'active' ? 'Actif' : 'Invite',
      avatarUrl: member?.profiles?.avatar_url || '',
      permissions: normalizePermissions(member.permissions),
    });
    return accumulator;
  }, {});

  const assigneesByTask = taskAssignees.reduce((accumulator, assignee) => {
    accumulator[assignee.task_id] = accumulator[assignee.task_id] ?? [];
    accumulator[assignee.task_id].push(assignee.profiles?.display_name || assignee.display_name || 'Assigne');
    return accumulator;
  }, {});

  const tasksByProject = {};
  const personalTasks = [];

  tasks.forEach((task) => {
    const mappedTask = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      interventionType: task.intervention_type || '',
      dueDate: formatDate(task.due_date),
      section: sections.find((section) => section.id === task.section_id)?.name || task.source_label || 'General chantier',
      assignees: assigneesByTask[task.id] ?? [],
      priority: taskPriorityMap[task.priority] || 'Pas urgent',
      status: taskStatusMap[task.status] || 'A faire',
      completed: task.status === 'done',
      archived: Boolean(task.archived_at) || task.status === 'archived',
      source: task.project_id ? 'Projet' : task.source_label || 'Personnel',
    };

    if (task.project_id) {
      tasksByProject[task.project_id] = tasksByProject[task.project_id] ?? [];
      tasksByProject[task.project_id].push(mappedTask);
    } else {
      personalTasks.push(mappedTask);
    }
  });

  const documentsByProject = documents.reduce((accumulator, document) => {
    accumulator[document.project_id] = accumulator[document.project_id] ?? { adminDocs: [], docs: [] };
    const mapped = {
      id: document.id,
      type: document.document_kind,
      title: document.title,
      date: formatDate(document.document_date),
      status: document.status || 'Brouillon',
      fileName: document.file_name || '',
      category: document.category || '',
      subcategory: document.subcategory || '',
      name: document.title,
      version: document.version_label || 'v1',
      archived: Boolean(document.archived_at),
    };

    if (ADMIN_DOC_TYPES.has(document.document_kind)) {
      accumulator[document.project_id].adminDocs.push(mapped);
    } else {
      accumulator[document.project_id].docs.push(mapped);
    }
    return accumulator;
  }, {});

  const versionsByPlan = planVersions.reduce((accumulator, version) => {
    accumulator[version.plan_id] = accumulator[version.plan_id] ?? [];
    accumulator[version.plan_id].push({
      id: version.id,
      version: version.version_number,
      updatedAt: formatDate(version.created_at),
      pins: Array.isArray(version.annotations) ?version.annotations.length : 0,
      annotations: Array.isArray(version.annotations) ?version.annotations : [],
      imageUrl: version.rendered_image_url || '',
      fileName: version.file_name || '',
    });
    return accumulator;
  }, {});

  const plansByProject = plans.reduce((accumulator, plan) => {
    const versionList = versionsByPlan[plan.id] ?? [];
    const latestVersion = versionList[0] ?? null;
    accumulator[plan.project_id] = accumulator[plan.project_id] ?? [];
    accumulator[plan.project_id].push({
      id: plan.id,
      name: plan.title,
      version: latestVersion?.version || 1,
      updatedAt: formatDate(plan.updated_at),
      pins: latestVersion?.pins || 0,
      fileName: latestVersion?.fileName || '',
      imageUrl: latestVersion?.imageUrl || '',
      annotations: latestVersion?.annotations || [],
      versions: versionList,
      archived: Boolean(plan.archived_at),
    });
    return accumulator;
  }, {});

  const membersByConversation = conversationMembers.reduce((accumulator, item) => {
    accumulator[item.conversation_id] = accumulator[item.conversation_id] ?? [];
    accumulator[item.conversation_id].push(item);
    return accumulator;
  }, {});

  const messagesByConversation = {};
  for (const message of messages) {
    messagesByConversation[message.conversation_id] = messagesByConversation[message.conversation_id] ?? [];
    messagesByConversation[message.conversation_id].push(await mapMessageToUi(message, currentUserId));
  }

  const conversationsByProject = conversations.reduce((accumulator, conversation) => {
    if (!conversation.project_id) return accumulator;
    const memberList = membersByConversation[conversation.id] ?? [];
    const thread = messagesByConversation[conversation.id] ?? [];
    const lastMessage = thread[thread.length - 1];

    accumulator[conversation.project_id] = accumulator[conversation.project_id] ?? [];
    accumulator[conversation.project_id].push({
      id: conversation.id,
      type: conversation.conversation_type,
      name:
        conversation.title ||
        memberList
          .map((member) => member.profiles?.display_name)
          .filter((name) => name && name !== currentUserName)
          .join(', ') ||
        'Conversation',
      participants: memberList.length,
      unread: 0,
      preview: lastMessage?.text || 'Aucun message',
      private: conversation.conversation_type !== 'project_general',
      messages: thread,
    });
    return accumulator;
  }, {});

  const directMessages = conversations
    .filter((conversation) => conversation.conversation_type === 'direct' && !conversation.project_id)
    .map((conversation) => {
      const memberList = membersByConversation[conversation.id] ?? [];
      const thread = messagesByConversation[conversation.id] ?? [];
      const lastMessage = thread[thread.length - 1];

      return {
        id: conversation.id,
        name:
          conversation.title ||
          memberList
            .map((member) => member.profiles?.display_name)
            .filter((name) => name && name !== currentUserName)
            .join(', ') ||
          'Discussion privee',
        participants: memberList.length,
        unread: 0,
        preview: lastMessage?.text || 'Aucun message',
        messages: thread,
      };
    });

  const timelineByProject = activity.reduce((accumulator, event) => {
    accumulator[event.project_id] = accumulator[event.project_id] ?? [];
    accumulator[event.project_id].push({
      id: event.id,
      label: event.label,
      date: formatDate(event.created_at),
      tone: event.tone || 'info',
    });
    return accumulator;
  }, {});

  const projectList = projects.map((project) => {
    const projectSectionRecords = sectionsByProject[project.id] ?? [];
    const projectSections = projectSectionRecords.map((item) => item.name);
    const docs = documentsByProject[project.id] ?? { adminDocs: [], docs: [] };

    return {
      ...emptyProject,
      id: project.id,
      organizationId: project.organization_id,
      name: project.name,
      client: project.client_name || 'Client a preciser',
      site: project.site_label || project.site_city || 'Localisation a preciser',
      status: project.status,
      archived: Boolean(project.archived_at),
      progress: project.progress ?? 0,
      budget: formatBudget(project.budget_amount, project.currency_code),
      startDate: formatDate(project.start_date),
      endDate: formatDate(project.end_date),
      period: [formatDate(project.start_date), formatDate(project.end_date)].filter(Boolean).join(' -> '),
      sections: projectSections.length ?projectSections : ['General chantier'],
      sectionRecords: projectSectionRecords,
      sectionIdMap: Object.fromEntries(projectSectionRecords.map((item) => [item.name, item.id])),
      participants: membersByProject[project.id] ?? [],
      adminDocs: docs.adminDocs,
      documents: docs.docs,
      plans: plansByProject[project.id] ?? [],
      tasks: tasksByProject[project.id] ?? [],
      conversations: conversationsByProject[project.id] ?? [],
      timeline: timelineByProject[project.id] ?? [],
    };
  });

  const friends = unique(
    projectList.flatMap((project) =>
      project.participants
        .filter((participant) => participant.userId !== currentUserId)
        .map((participant) =>
          JSON.stringify({
            id: participant.id,
            userId: participant.userId,
            name: participant.name,
            trade: participant.role,
            status: participant.status === 'Actif' ? 'En ligne' : 'Hors ligne',
            email: participant.email,
            company: participant.company,
            avatarUrl: participant.avatarUrl,
          })
        )
    )
  ).map((item) => JSON.parse(item));

  const messageCount = Object.values(messagesByConversation).reduce((total, thread) => total + thread.length, 0);
  const normalizeStatus = (value) =>
    (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const visibleOpenTasksCount =
    personalTasks.filter((task) => !task.archived && !task.completed).length +
    projectList.reduce((total, project) => total + project.tasks.filter((task) => !task.archived && !task.completed).length, 0);
  const visiblePendingDocsCount = projectList.reduce(
    (total, project) =>
      total +
      [...project.documents, ...project.adminDocs].filter(
        (doc) => !doc.archived && ['a verifier', 'en revision', 'en attente'].includes(normalizeStatus(doc.status))
      ).length,
    0
  );
  const pendingInvitations = invitations.map((invitation) => ({
    id: invitation.id,
    projectId: invitation.project_id,
    projectName: invitation.project_name || invitation.projects?.name || 'Chantier',
    client: invitation.projects?.client_name || '',
    site: invitation.projects?.site_label || '',
    role: roleLabelMap[invitation.role] || 'Entrepreneur',
    status: invitation.status,
    createdAt: formatDate(invitation.created_at),
    respondedAt: formatDate(invitation.responded_at),
  }));
  const activeProjects = projectList.filter((project) => !project.archived);

  return {
    ...emptyWorkspace,
    organization: organizationMembership?.organizations ?? null,
    user: {
      id: profile.id,
      name: profile.display_name || profile.email || 'Utilisateur',
      role: currentUserRole,
      company: profile.company_name || organizationMembership?.organizations?.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      city: profile.city || '',
      avatarUrl: profile.avatar_url || '',
      status: profile.availability_status || 'En ligne',
      summary: profile.summary || '',
      specialty: profile.specialty || '',
      availability: profile.availability_label || '',
      zone: profile.service_area || '',
      website: profile.website || '',
    },
    stats: [
      { label: 'Chantiers actifs', value: activeProjects.length, detail: `${projectList.length} chantiers visibles` },
      { label: 'Taches a traiter', value: visibleOpenTasksCount, detail: `${personalTasks.length} personnelles` },
      { label: 'Documents a valider', value: visiblePendingDocsCount, detail: 'Documents et administratif' },
      { label: 'Messages non lus', value: messageCount, detail: 'Conversations actives' },
    ],
    personalTasks,
    friends,
    directMessages,
    projects: projectList,
    pendingInvitations,
  };
};

export const loadWorkspace = async () => {
  const user = await getCurrentUser();
  if (!user) {
    return { workspace: emptyWorkspace, user: null };
  }

  await bootstrapWorkspace();

  const profile = await fetchProfile(user.id);
  const memberships = await fetchOrganizationMemberships(user.id);
  const invitations = await fetchProjectInvitations(profile.email || user.email || '');
  const organizationIds = memberships.map((membership) => membership.organization_id);

  if (!organizationIds.length) {
    return {
      workspace: {
        ...emptyWorkspace,
        user: {
          ...emptyWorkspace.user,
          id: profile.id,
          name: profile.display_name || profile.email || 'Utilisateur',
          email: profile.email || '',
        },
        pendingInvitations: invitations.map((invitation) => ({
          id: invitation.id,
          projectId: invitation.project_id,
          projectName: invitation.project_name || invitation.projects?.name || 'Chantier',
          client: invitation.projects?.client_name || '',
          site: invitation.projects?.site_label || '',
          role: roleLabelMap[invitation.role] || 'Entrepreneur',
          status: invitation.status,
          createdAt: formatDate(invitation.created_at),
          respondedAt: formatDate(invitation.responded_at),
        })),
      },
      user,
    };
  }

  const projects = await fetchProjects(organizationIds);
  const projectIds = projects.map((project) => project.id);

  const [projectMembers, sections, tasks, documents, plansData, conversationsData, activity] = await Promise.all([
    fetchProjectMembers(projectIds),
    fetchProjectSections(projectIds),
    fetchTasks(organizationIds, projectIds, user.id),
    fetchDocuments(projectIds),
    fetchPlans(projectIds),
    fetchConversations(projectIds, user.id),
    fetchActivity(projectIds),
  ]);

  const taskAssignees = await fetchTaskAssignees(tasks.map((task) => task.id));
  const relatedProfileIds = [
    ...projectMembers.map((item) => item.user_id),
    ...taskAssignees.map((item) => item.user_id),
    ...conversationsData.members.map((item) => item.user_id),
  ];
  const relatedProfiles = await fetchProfilesByIds(relatedProfileIds);
  const profilesById = Object.fromEntries(relatedProfiles.map((item) => [item.id, item]));

  const hydratedProjectMembers = projectMembers.map((item) => ({
    ...item,
    profiles: item.user_id ? (profilesById[item.user_id] ?? null) : null,
  }));

  const hydratedTaskAssignees = taskAssignees.map((item) => ({
    ...item,
    profiles: item.user_id ? (profilesById[item.user_id] ?? null) : null,
  }));

  const hydratedConversationMembers = conversationsData.members.map((item) => ({
    ...item,
    profiles: item.user_id ? (profilesById[item.user_id] ?? null) : null,
  }));

  return {
    workspace: await mapWorkspace({
      profile,
      memberships,
      projects,
      projectMembers: hydratedProjectMembers,
      sections,
      tasks,
      taskAssignees: hydratedTaskAssignees,
      documents,
      plans: plansData.plans,
      planVersions: plansData.versions,
      conversations: conversationsData.conversations,
      conversationMembers: hydratedConversationMembers,
      messages: conversationsData.messages,
      activity,
      invitations,
    }),
    user,
  };
};

const getPrimaryOrganizationContext = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');
  const memberships = await fetchOrganizationMemberships(user.id);
  const organizationId = memberships[0]?.organization_id;
  if (!organizationId) throw new Error('Aucune organisation active.');
  return { organizationId, user };
};

const logActivity = async (projectId, label, payload = {}) => {
  const user = await getCurrentUser();
  if (!user || !projectId) return;
  await supabase.from('activity_events').insert({
    project_id: projectId,
    actor_id: user.id,
    label,
    payload,
    tone: 'info',
  });
};

export const saveProfileRecord = async (profile, avatarFile = null) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');

  let avatar = null;
  if (avatarFile) {
    avatar = await uploadFile({ file: avatarFile, folder: `profiles/${user.id}` });
  }

  const payload = {
    id: user.id,
    email: profile.email || user.email,
    display_name: profile.name,
    company_name: profile.company,
    phone: profile.phone,
    city: profile.city,
    availability_status: profile.status,
    summary: profile.summary,
    specialty: profile.specialty,
    availability_label: profile.availability,
    service_area: profile.zone,
    website: profile.website,
  };

  if (avatar?.signedUrl) {
    payload.avatar_url = avatar.signedUrl;
    payload.avatar_storage_path = avatar.storage_path;
  }

  const { error } = await supabase.from('profiles').upsert(payload);
  if (error) throw error;
};

export const saveProjectRecord = async ({ projectForm, participants, editingProjectId, currentUserProfile }) => {
  const { organizationId, user } = await getPrimaryOrganizationContext();

  const projectPayload = {
    organization_id: organizationId,
    name: projectForm.name.trim(),
    slug: slugify(projectForm.name) || `chantier-${Date.now()}`,
    client_name: projectForm.client.trim() || 'Client a preciser',
    site_label: projectForm.site.trim(),
    site_city: projectForm.site.trim(),
    budget_amount: Number.parseFloat((projectForm.budget || '').replace(/[^\d.,-]/g, '').replace(',', '.')) || null,
    start_date: projectForm.startDate || null,
    end_date: projectForm.endDate || null,
    created_by: user.id,
  };

  let projectId = editingProjectId;
  if (editingProjectId) {
    const { error } = await supabase.from('projects').update(projectPayload).eq('id', editingProjectId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('projects').insert(projectPayload).select('id').single();
    if (error) throw error;
    projectId = data.id;
  }

  const sectionNames = unique(
    (projectForm.sectionsInput || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );

  if (sectionNames.length) {
    const { error } = await supabase.from('project_sections').upsert(
      sectionNames.map((name, index) => ({ project_id: projectId, name, sort_order: index })),
      { onConflict: 'project_id,name' }
    );
    if (error) throw error;
  }

  const memberRows = participants.map((participant) => ({
    project_id: projectId,
    user_id: participant.email === currentUserProfile.email ?user.id : null,
    display_name: participant.name,
    email: participant.email,
    company_name: participant.company,
    role: roleToDbMap[participant.role] || 'contractor',
    status: participant.email === currentUserProfile.email ? 'active' : 'invited',
  }));

  const { error: membersError } = await supabase.from('project_members').upsert(memberRows, { onConflict: 'project_id,email' });
  if (membersError) throw membersError;

  if (!editingProjectId) {
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        conversation_type: 'project_general',
        title: 'Discussion generale',
        created_by: user.id,
      })
      .select('id')
      .single();
    if (conversationError) throw conversationError;

    const conversationMembers = memberRows
      .filter((row) => row.user_id)
      .map((row) => ({ conversation_id: conversation.id, user_id: row.user_id }));

    if (conversationMembers.length) {
      const { error } = await supabase.from('conversation_members').upsert(conversationMembers, {
        onConflict: 'conversation_id,user_id',
      });
      if (error) throw error;
    }
  }

  await logActivity(projectId, editingProjectId ? 'Chantier mis a jour' : 'Chantier cree');
  return projectId;
};

export const inviteProjectMemberRecord = async ({ projectId, email, role }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const { data: projectRow, error: projectError } = await supabase.from('projects').select('name').eq('id', projectId).single();
  if (projectError) throw projectError;

  const { error: memberError } = await supabase.from('project_members').upsert(
    {
      project_id: projectId,
      email,
      display_name: email,
      role: roleToDbMap[role] || 'contractor',
      status: 'invited',
      permissions: {},
    },
    { onConflict: 'project_id,email' }
  );
  if (memberError) throw memberError;

  const { error: invitationError } = await supabase.from('project_invitations').insert({
    project_id: projectId,
    project_name: projectRow?.name || 'Chantier',
    email,
    role: roleToDbMap[role] || 'contractor',
    token,
    invited_by: user.id,
    status: 'pending',
  });
  if (invitationError) throw invitationError;
  await logActivity(projectId, 'Invitation envoyee', { email, role });
};

export const updateProjectMemberRoleRecord = async (memberId, role) => {
  const { error } = await supabase.from('project_members').update({ role: roleToDbMap[role] || 'contractor' }).eq('id', memberId);
  if (error) throw error;
};

export const updateProjectMemberPermissionsRecord = async (memberId, permissions) => {
  const { error } = await supabase.from('project_members').update({ permissions: normalizePermissions(permissions) }).eq('id', memberId);
  if (error) throw error;
};

export const removeProjectMemberRecord = async (memberId) => {
  const { error } = await supabase.from('project_members').delete().eq('id', memberId);
  if (error) throw error;
};

export const addProjectSectionRecord = async (projectId, name) => {
  const { data: existingSections, error: existingSectionsError } = await supabase
    .from('project_sections')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1);
  if (existingSectionsError) throw existingSectionsError;

  const { error } = await supabase.from('project_sections').insert({
    project_id: projectId,
    name,
    sort_order: (existingSections?.[0]?.sort_order ?? -1) + 1,
  });
  if (error) throw error;
  await logActivity(projectId, 'Section ajoutee', { section: name });
};

export const createProjectTaskRecord = async ({ projectId, organizationId, task, sectionIdMap, assigneeIdsByName }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      section_id: sectionIdMap[task.section] || null,
      title: task.title.trim(),
      description: task.description,
      intervention_type: task.interventionType,
      due_date: task.dueDate || null,
      priority: reverseTaskPriorityMap[task.priority] || 'medium',
      status: 'todo',
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error) throw error;

  const assigneeRows = (task.assignees || [])
    .map((name) => {
      const assignee = assigneeIdsByName[name];
      if (!assignee) return null;
      if (typeof assignee === 'string') {
        return { task_id: data.id, user_id: assignee, display_name: name };
      }
      if (!assignee.userId) {
        return null;
      }
      return { task_id: data.id, user_id: assignee.userId, display_name: assignee.displayName || name };
    })
    .filter(Boolean);

  if (assigneeRows.length) {
    const { error: assigneeError } = await supabase.from('task_assignees').insert(assigneeRows);
    if (assigneeError) throw assigneeError;
  }

  await logActivity(projectId, 'Tache creee', { title: task.title });
};

export const updateTaskRecord = async ({ taskId, updates, projectId, sectionIdMap }) => {
  const payload = {};
  if (typeof updates.title !== 'undefined') payload.title = updates.title;
  if (typeof updates.description !== 'undefined') payload.description = updates.description;
  if (typeof updates.interventionType !== 'undefined') payload.intervention_type = updates.interventionType;
  if (typeof updates.dueDate !== 'undefined') payload.due_date = updates.dueDate || null;
  if (typeof updates.priority !== 'undefined') payload.priority = reverseTaskPriorityMap[updates.priority] || 'medium';
  if (typeof updates.status !== 'undefined') payload.status = reverseTaskStatusMap[updates.status] || 'todo';
  if (typeof updates.section !== 'undefined') payload.section_id = sectionIdMap[updates.section] || null;

  const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
  if (error) throw error;
  if (projectId) await logActivity(projectId, 'Tache mise a jour', { task_id: taskId });
};

export const deleteTaskRecord = async (taskId) => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
};

export const archiveProjectRecord = async (projectId, archived) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connectA.');
  const payload = archived
    ? { archived_at: new Date().toISOString(), archived_by: user.id }
    : { archived_at: null, archived_by: null };
  const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
  if (error) throw error;
  await logActivity(projectId, archived ? 'Chantier archive' : 'Chantier restaure');
};

export const archiveTaskRecord = async ({ taskId, archived, projectId }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connectA.');
  const payload = archived
    ? { archived_at: new Date().toISOString(), archived_by: user.id, status: 'archived' }
    : { archived_at: null, archived_by: null, status: 'todo' };
  const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
  if (error) throw error;
  if (projectId) await logActivity(projectId, archived ? 'Tache archivee' : 'Tache restauree', { task_id: taskId });
};

export const archiveDocumentRecord = async ({ documentId, archived, projectId }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connectA.');
  const payload = archived
    ? { archived_at: new Date().toISOString(), archived_by: user.id }
    : { archived_at: null, archived_by: null };
  const { error } = await supabase.from('documents').update(payload).eq('id', documentId);
  if (error) throw error;
  if (projectId) await logActivity(projectId, archived ? 'Document archive' : 'Document restaure', { document_id: documentId });
};

export const archivePlanRecord = async ({ planId, archived, projectId }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connectA.');
  const payload = archived
    ? { archived_at: new Date().toISOString(), archived_by: user.id }
    : { archived_at: null, archived_by: null };
  const { error } = await supabase.from('plans').update(payload).eq('id', planId);
  if (error) throw error;
  if (projectId) await logActivity(projectId, archived ? 'Plan archive' : 'Plan restaure', { plan_id: planId });
};

export const savePersonalTaskRecord = async ({ task, organizationId }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connect?.');
  const organizationContext = organizationId ? { organizationId, user } : await getPrimaryOrganizationContext();

  const { error } = await supabase.from('tasks').insert({
    organization_id: organizationContext.organizationId,
    title: task.title.trim(),
    due_date: task.dueDate || null,
    priority: reverseTaskPriorityMap[task.priority] || 'medium',
    status: 'todo',
    source_label: task.source || 'Personnel',
    created_by: user.id,
  });
  if (error) throw error;
};

export const upsertProjectDocumentRecord = async ({ projectId, doc, kind }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');

  const payload = {
    project_id: projectId,
    document_kind: kind,
    title: doc.title || doc.name,
    category: doc.category || null,
    subcategory: doc.subcategory || null,
    version_label: doc.version || null,
    status: doc.status || null,
    document_date: doc.date || null,
    file_name: doc.fileName || null,
    created_by: user.id,
  };

  if (doc.id) {
    const { error } = await supabase.from('documents').update(payload).eq('id', doc.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('documents').insert(payload);
    if (error) throw error;
  }

  await logActivity(projectId, 'Document mis a jour', { title: payload.title, kind });
};

export const upsertPlanRecord = async ({ projectId, plan }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');

  let planId = plan.id;
  if (planId) {
    const { error } = await supabase.from('plans').update({ title: plan.name, updated_by: user.id }).eq('id', planId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('plans').insert({ project_id: projectId, title: plan.name, updated_by: user.id }).select('id').single();
    if (error) throw error;
    planId = data.id;
  }

  const nextVersion =
    Array.isArray(plan.versions) && plan.versions.length
      ?Math.max(...plan.versions.map((version) => version.version || 1)) + 1
      : plan.version || 1;

  const { error: versionError } = await supabase.from('plan_versions').insert({
    plan_id: planId,
    version_number: nextVersion,
    annotations: plan.annotations || [],
    rendered_image_url: plan.imageUrl || null,
    file_name: plan.fileName || null,
    created_by: user.id,
  });
  if (versionError) throw versionError;
  await logActivity(projectId, 'Plan mis a jour', { plan: plan.name });
};

export const ensureDirectConversationRecord = async ({ organizationId, currentUserId, projectId, friend }) => {
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('conversation_type', 'direct')
    .is('project_id', null);
  if (conversationsError) throw conversationsError;

  if (friend.userId) {
    for (const conversation of conversations ?? []) {
      const { data: members, error: membersError } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversation.id);
      if (membersError) throw membersError;
      const ids = members.map((item) => item.user_id).sort();
      const targetIds = [currentUserId, friend.userId].sort();
      if (ids.length === 2 && ids[0] === targetIds[0] && ids[1] === targetIds[1]) {
        return conversation.id;
      }
    }
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      organization_id: organizationId,
      project_id: null,
      conversation_type: 'direct',
      title: friend.name,
      created_by: currentUserId,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (friend.userId) {
    const { error: ownMemberError } = await supabase
      .from('conversation_members')
      .upsert(
        [{ conversation_id: data.id, user_id: currentUserId }],
        { onConflict: 'conversation_id,user_id' },
      );
    if (ownMemberError) throw ownMemberError;

    const { error: friendMemberError } = await supabase
      .from('conversation_members')
      .upsert(
        [{ conversation_id: data.id, user_id: friend.userId }],
        { onConflict: 'conversation_id,user_id' },
      );
    if (friendMemberError) throw friendMemberError;
  }

  return data.id;
};

export const sendConversationMessageRecord = async ({ conversationId, text, file = null }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');
  const profile = await fetchProfile(user.id);

  let attachment = null;
  if (file) {
    attachment = await uploadFile({ file, folder: `messages/${conversationId}` });
  }

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    sender_name: profile.display_name || profile.email || 'Vous',
    body: text || null,
    attachment_storage_path: attachment?.storage_path || null,
    attachment_file_name: attachment?.file_name || null,
    attachment_mime_type: attachment?.mime_type || null,
    attachment_file_size: attachment?.file_size || null,
  });
  if (error) throw error;
};

export const respondToProjectInvitationRecord = async ({ invitationId, decision }) => {
  const { error } = await supabase.rpc('respond_to_project_invitation', {
    invitation_id: invitationId,
    decision,
  });
  if (error) throw error;
};
