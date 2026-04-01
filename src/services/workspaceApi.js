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
const formatDateTime = (value) =>
  value
    ?new Date(value).toLocaleString('fr-BE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const fieldLabelMap = {
  archived_at: 'archivage',
  body: 'message',
  budget_amount: 'budget',
  category: 'categorie',
  client_name: 'client',
  company_name: 'societe',
  description: 'description',
  document_date: 'date',
  due_date: 'echeance',
  end_date: 'date de fin',
  file_name: 'fichier',
  permissions: 'permissions',
  priority: 'priorite',
  rendered_image_url: 'plan',
  role: 'role',
  section_id: 'section',
  site_label: 'site',
  specialty: 'specialite',
  start_date: 'date de debut',
  status: 'statut',
  title: 'titre',
  version_label: 'version',
};

const getFieldLabel = (field) => fieldLabelMap[field] || field.replace(/_/g, ' ');
const serializeComparable = (value) => JSON.stringify(value ?? null);
const pickDefined = (value) => (typeof value === 'undefined' ?null : value);

const diffFields = (before = {}, after = {}) => {
  const keys = unique([...Object.keys(before), ...Object.keys(after)]);
  return keys
    .filter((key) => serializeComparable(before[key]) !== serializeComparable(after[key]))
    .map((key) => ({
      field: key,
      before: pickDefined(before[key]),
      after: pickDefined(after[key]),
      label: getFieldLabel(key),
    }));
};

const summarizeChanges = (changes = []) => {
  const labels = unique(changes.map((change) => change.label).filter(Boolean)).slice(0, 3);
  if (!labels.length) return '';
  return labels.join(', ');
};

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
    .select('id, display_name, company_name, email, avatar_url, availability_status, specialty, city')
    .in('id', ids);
  if (error) throw error;
  return data ?? [];
};

const fetchProfileByEmail = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email, company_name, specialty, availability_status, city, avatar_url')
    .ilike('email', normalizedEmail)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
};

const fetchFriendships = async (userId) => {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_user_id.eq.${userId},addressee_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });
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

const fetchNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
};

const mergeFriendCollections = (...collections) => {
  const map = new Map();

  collections.flat().forEach((friend) => {
    if (!friend) return;
    const key = friend.userId || friend.email || friend.id;
    if (!key) return;
    map.set(key, { ...(map.get(key) ?? {}), ...friend });
  });

  return [...map.values()];
};

const fetchProjectContext = async (projectId) => {
  if (!projectId) return null;
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, organization_id, client_name, site_label, budget_amount, start_date, end_date')
    .eq('id', projectId)
    .single();
  if (error) throw error;
  return data;
};

const fetchProjectMemberUserIds = async (projectId, { includeInvited = false } = {}) => {
  if (!projectId) return [];
  let query = supabase.from('project_members').select('user_id').eq('project_id', projectId);
  if (!includeInvited) {
    query = query.eq('status', 'active');
  }
  const { data, error } = await query;
  if (error) throw error;
  return unique((data ?? []).map((item) => item.user_id));
};

const createNotifications = async (items, actorId) => {
  const rows = (items ?? [])
    .filter((item) => item?.userId)
    .map((item) => ({
      user_id: item.userId,
      actor_id: actorId,
      organization_id: item.organizationId || null,
      project_id: item.projectId || null,
      title: item.title,
      body: item.body || null,
      is_read: false,
      event_key: item.eventKey || 'workspace.notification',
      entity_type: item.entityType || 'workspace',
      entity_id: item.entityId ? String(item.entityId) : null,
      metadata: item.metadata || {},
    }));

  const uniqueRows = [...new Map(rows.map((row) => [`${row.user_id}:${row.event_key}:${row.entity_id || row.title}`, row])).values()];
  if (!uniqueRows.length) return;

  const { error } = await supabase.from('notifications').insert(uniqueRows);
  if (error) throw error;
};

const recordWorkspaceEvent = async ({
  actorId,
  organizationId = null,
  projectId = null,
  label,
  payload = {},
  tone = 'info',
  eventKey = 'workspace.activity',
  entityType = 'workspace',
  entityId = null,
  notifications = [],
}) => {
  if (!actorId) return;

  const eventPayload = {
    ...payload,
    eventKey,
    entityType,
    entityId: entityId ? String(entityId) : null,
  };

  const { error } = await supabase.from('activity_events').insert({
    organization_id: organizationId,
    project_id: projectId,
    actor_id: actorId,
    label,
    payload: eventPayload,
    tone,
    event_key: eventKey,
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : null,
  });
  if (error) throw error;

  await createNotifications(
    notifications
      .filter((item) => item?.userId && item.userId !== actorId)
      .map((item) => ({
        ...item,
        organizationId: item.organizationId || organizationId,
        projectId: item.projectId || projectId,
        eventKey: item.eventKey || eventKey,
        entityType: item.entityType || entityType,
        entityId: item.entityId || entityId,
      })),
    actorId
  );
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
    timestamp: message.created_at,
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
    notifications,
    invitations,
    friendships,
    profilesById = {},
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
      const otherParticipantName = memberList
        .map((member) => member.profiles?.display_name)
        .filter((name) => name && name !== currentUserName)
        .join(', ');

      return {
        id: conversation.id,
        name: otherParticipantName || conversation.title || 'Discussion privee',
        participants: memberList.length,
        unread: 0,
        preview: lastMessage?.text || 'Aucun message',
        updatedAt: lastMessage?.timestamp || conversation.updated_at || conversation.created_at || null,
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

  const acceptedFriendships = friendships
    .filter((friendship) => friendship.status === 'accepted')
    .map((friendship) => {
      const isRequester = friendship.requester_user_id === currentUserId;
      const otherUserId = isRequester ? friendship.addressee_user_id : friendship.requester_user_id;
      const otherProfile = profilesById[otherUserId] ?? null;

      return {
        id: otherUserId || friendship.id,
        friendshipId: friendship.id,
        userId: otherUserId,
        name: otherProfile?.display_name || otherProfile?.email || friendship.requester_name || 'Contact',
        trade: otherProfile?.specialty || friendship.requester_trade || 'Partenaire',
        status: otherProfile?.availability_status || 'En ligne',
        email: otherProfile?.email || friendship.requester_email || '',
        company: otherProfile?.company_name || '',
        city: otherProfile?.city || '',
        avatarUrl: otherProfile?.avatar_url || '',
      };
    });

  const friendInvitations = friendships
    .filter((friendship) => friendship.status === 'pending' && friendship.addressee_user_id === currentUserId)
    .map((friendship) => {
      const requesterProfile = profilesById[friendship.requester_user_id] ?? null;
      return {
        id: friendship.id,
        userId: friendship.requester_user_id,
        name: requesterProfile?.display_name || friendship.requester_name || friendship.requester_email || 'Contact',
        trade: requesterProfile?.specialty || friendship.requester_trade || 'Partenaire',
        email: requesterProfile?.email || friendship.requester_email || '',
        createdAt: formatDate(friendship.created_at),
        status: friendship.status,
      };
    });

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
  const notificationItems = notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body || '',
    projectId: notification.project_id || null,
    organizationId: notification.organization_id || null,
    isRead: Boolean(notification.is_read),
    readAt: notification.read_at || null,
    eventKey: notification.event_key || 'workspace.notification',
    entityType: notification.entity_type || 'workspace',
    entityId: notification.entity_id || null,
    createdAt: notification.created_at,
    createdLabel: formatDateTime(notification.created_at),
    metadata: notification.metadata || {},
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
    friends: mergeFriendCollections(friends, acceptedFriendships),
    friendInvitations,
    directMessages,
    projects: projectList,
    pendingInvitations,
    notifications: notificationItems,
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
  const friendships = await fetchFriendships(user.id);
  const notifications = await fetchNotifications(user.id);
  const organizationIds = memberships.map((membership) => membership.organization_id);

  if (!organizationIds.length) {
    const friendshipUserIds = unique(
      friendships.flatMap((friendship) => [friendship.requester_user_id, friendship.addressee_user_id]).filter((id) => id && id !== user.id)
    );
    const friendshipProfiles = await fetchProfilesByIds(friendshipUserIds);
    const friendshipProfilesById = Object.fromEntries(friendshipProfiles.map((item) => [item.id, item]));

    return {
      workspace: {
        ...emptyWorkspace,
        user: {
          ...emptyWorkspace.user,
          id: profile.id,
          name: profile.display_name || profile.email || 'Utilisateur',
          email: profile.email || '',
        },
        friends: friendships
          .filter((friendship) => friendship.status === 'accepted')
          .map((friendship) => {
            const otherUserId = friendship.requester_user_id === user.id ? friendship.addressee_user_id : friendship.requester_user_id;
            const otherProfile = friendshipProfilesById[otherUserId] ?? null;
            return {
              id: otherUserId || friendship.id,
              friendshipId: friendship.id,
              userId: otherUserId,
              name: otherProfile?.display_name || otherProfile?.email || 'Contact',
              trade: otherProfile?.specialty || 'Partenaire',
              status: otherProfile?.availability_status || 'En ligne',
              email: otherProfile?.email || '',
              company: otherProfile?.company_name || '',
              city: otherProfile?.city || '',
              avatarUrl: otherProfile?.avatar_url || '',
            };
          }),
        friendInvitations: friendships
          .filter((friendship) => friendship.status === 'pending' && friendship.addressee_user_id === user.id)
          .map((friendship) => ({
            id: friendship.id,
            userId: friendship.requester_user_id,
            name:
              friendshipProfilesById[friendship.requester_user_id]?.display_name ||
              friendship.requester_name ||
              friendship.requester_email ||
              'Contact',
            trade: friendshipProfilesById[friendship.requester_user_id]?.specialty || friendship.requester_trade || 'Partenaire',
            email: friendshipProfilesById[friendship.requester_user_id]?.email || friendship.requester_email || '',
            createdAt: formatDate(friendship.created_at),
            status: friendship.status,
          })),
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
        notifications: notifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          body: notification.body || '',
          projectId: notification.project_id || null,
          organizationId: notification.organization_id || null,
          isRead: Boolean(notification.is_read),
          readAt: notification.read_at || null,
          eventKey: notification.event_key || 'workspace.notification',
          entityType: notification.entity_type || 'workspace',
          entityId: notification.entity_id || null,
          createdAt: notification.created_at,
          createdLabel: formatDateTime(notification.created_at),
          metadata: notification.metadata || {},
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
    ...friendships.map((item) => item.requester_user_id),
    ...friendships.map((item) => item.addressee_user_id),
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
      notifications,
      invitations,
      friendships,
      profilesById,
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

export const markNotificationsReadRecord = async (notificationIds = []) => {
  const ids = unique(notificationIds);
  if (!ids.length) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .in('id', ids)
    .eq('is_read', false);
  if (error) throw error;
};

export const saveProfileRecord = async (profile, avatarFile = null) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');
  const memberships = await fetchOrganizationMemberships(user.id);
  const organizationId = memberships[0]?.organization_id || null;
  const existingProfile = await fetchProfile(user.id);

  let avatar = null;
  if (avatarFile) {
    avatar = await uploadFile({ file: avatarFile, folder: `profiles/${user.id}` });
  }

  const payload = {
    user_id: user.id,
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
  };

  if (avatar?.signedUrl) {
    payload.avatar_url = avatar.signedUrl;
    payload.avatar_storage_path = avatar.storage_path;
  }

  const { error } = await supabase.from('profiles').upsert(payload);
  if (error) throw error;

  const changes = diffFields(
    {
      display_name: existingProfile?.display_name,
      email: existingProfile?.email,
      company_name: existingProfile?.company_name,
      phone: existingProfile?.phone,
      city: existingProfile?.city,
      availability_status: existingProfile?.availability_status,
      specialty: existingProfile?.specialty,
      service_area: existingProfile?.service_area,
    },
    payload
  );

  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId,
    label: 'Profil mis a jour',
    eventKey: 'profile.updated',
    entityType: 'profile',
    entityId: user.id,
    payload: {
      profileName: payload.display_name || payload.email || 'Utilisateur',
      changes,
    },
  });
};

export const saveProjectRecord = async ({ projectForm, participants, editingProjectId, currentUserProfile }) => {
  const { organizationId, user } = await getPrimaryOrganizationContext();
  const existingProject = editingProjectId ?await fetchProjectContext(editingProjectId) : null;

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

  const memberUserIds = await fetchProjectMemberUserIds(projectId, { includeInvited: false });
  const changes = editingProjectId
    ?diffFields(
      {
        name: existingProject?.name,
        client_name: existingProject?.client_name,
        site_label: existingProject?.site_label,
        budget_amount: existingProject?.budget_amount,
        start_date: existingProject?.start_date,
        end_date: existingProject?.end_date,
      },
      projectPayload
    )
    : [];

  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId,
    projectId,
    label: editingProjectId ? 'Chantier mis a jour' : 'Chantier cree',
    eventKey: editingProjectId ? 'project.updated' : 'project.created',
    entityType: 'project',
    entityId: projectId,
    payload: {
      projectName: projectPayload.name,
      participantCount: memberUserIds.length,
      changes,
    },
    notifications: memberUserIds.map((memberUserId) => ({
      userId: memberUserId,
      title: editingProjectId ? `Chantier mis a jour: ${projectPayload.name}` : `Nouveau chantier: ${projectPayload.name}`,
      body: editingProjectId
        ?`Modifications detectees: ${summarizeChanges(changes) || 'mise a jour generale'}.`
        : 'Le chantier vient d etre cree et partage avec vous.',
      metadata: {
        projectName: projectPayload.name,
        changes,
      },
    })),
  });
  return projectId;
};

export const inviteProjectMemberRecord = async ({ projectId, email, role }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const { data: projectRow, error: projectError } = await supabase
    .from('projects')
    .select('name, organization_id')
    .eq('id', projectId)
    .single();
  if (projectError) throw projectError;
  const invitedProfile = await fetchProfileByEmail(email);

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
  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId: projectRow.organization_id,
    projectId,
    label: 'Invitation envoyee',
    eventKey: 'project.member_invited',
    entityType: 'project_member',
    entityId: email,
    payload: {
      email,
      role,
      projectName: projectRow?.name || 'Chantier',
    },
    notifications: invitedProfile?.id
      ?[
        {
          userId: invitedProfile.id,
          title: `Invitation chantier: ${projectRow?.name || 'Chantier'}`,
          body: `Vous avez ete invite en tant que ${role}.`,
          metadata: { email, role, projectName: projectRow?.name || 'Chantier' },
        },
      ]
      : [],
  });
};

export const updateProjectMemberRoleRecord = async (memberId, role) => {
  const { data: member, error: memberFetchError } = await supabase
    .from('project_members')
    .select('id, project_id, user_id, display_name, email, role')
    .eq('id', memberId)
    .single();
  if (memberFetchError) throw memberFetchError;

  const nextRole = roleToDbMap[role] || 'contractor';
  const { error } = await supabase.from('project_members').update({ role: nextRole }).eq('id', memberId);
  if (error) throw error;
  const project = await fetchProjectContext(member.project_id);
  const changes = diffFields({ role: member.role }, { role: nextRole });
  const actor = await getCurrentUser();
  await recordWorkspaceEvent({
    actorId: actor?.id,
    organizationId: project?.organization_id,
    projectId: member.project_id,
    label: 'Role intervenant modifie',
    eventKey: 'project.member_role_updated',
    entityType: 'project_member',
    entityId: memberId,
    payload: {
      memberName: member.display_name || member.email || 'Intervenant',
      changes,
    },
    notifications: member.user_id
      ?[
        {
          userId: member.user_id,
          title: `Role mis a jour sur ${project?.name || 'le chantier'}`,
          body: `Votre role est maintenant ${role}.`,
          metadata: { memberId, role, projectName: project?.name || '' },
        },
      ]
      : [],
  });
};

export const updateProjectMemberPermissionsRecord = async (memberId, permissions) => {
  const { data: member, error: memberFetchError } = await supabase
    .from('project_members')
    .select('id, project_id, user_id, display_name, email, permissions')
    .eq('id', memberId)
    .single();
  if (memberFetchError) throw memberFetchError;
  const nextPermissions = normalizePermissions(permissions);
  const { error } = await supabase.from('project_members').update({ permissions: nextPermissions }).eq('id', memberId);
  if (error) throw error;
  const project = await fetchProjectContext(member.project_id);
  const actor = await getCurrentUser();
  const changes = diffFields({ permissions: member.permissions || {} }, { permissions: nextPermissions });
  await recordWorkspaceEvent({
    actorId: actor?.id,
    organizationId: project?.organization_id,
    projectId: member.project_id,
    label: 'Permissions intervenant modifiees',
    eventKey: 'project.member_permissions_updated',
    entityType: 'project_member',
    entityId: memberId,
    payload: {
      memberName: member.display_name || member.email || 'Intervenant',
      changes,
    },
    notifications: member.user_id
      ?[
        {
          userId: member.user_id,
          title: `Acces chantier mis a jour: ${project?.name || 'Chantier'}`,
          body: `Vos permissions ont change: ${summarizeChanges(changes) || 'acces chantier'}.`,
          metadata: { memberId, changes, projectName: project?.name || '' },
        },
      ]
      : [],
  });
};

export const removeProjectMemberRecord = async (memberId) => {
  const { data: member, error: memberFetchError } = await supabase
    .from('project_members')
    .select('id, project_id, user_id, display_name, email')
    .eq('id', memberId)
    .single();
  if (memberFetchError) throw memberFetchError;
  const { error } = await supabase.from('project_members').delete().eq('id', memberId);
  if (error) throw error;
  const project = await fetchProjectContext(member.project_id);
  const actor = await getCurrentUser();
  await recordWorkspaceEvent({
    actorId: actor?.id,
    organizationId: project?.organization_id,
    projectId: member.project_id,
    label: 'Intervenant retire',
    eventKey: 'project.member_removed',
    entityType: 'project_member',
    entityId: memberId,
    payload: {
      memberName: member.display_name || member.email || 'Intervenant',
    },
    notifications: member.user_id
      ?[
        {
          userId: member.user_id,
          title: `Retrait du chantier: ${project?.name || 'Chantier'}`,
          body: 'Votre acces a ce chantier a ete retire.',
          metadata: { memberId, projectName: project?.name || '' },
        },
      ]
      : [],
  });
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
  const actor = await getCurrentUser();
  const project = await fetchProjectContext(projectId);
  const memberUserIds = await fetchProjectMemberUserIds(projectId);
  await recordWorkspaceEvent({
    actorId: actor?.id,
    organizationId: project?.organization_id,
    projectId,
    label: 'Section ajoutee',
    eventKey: 'project.section_created',
    entityType: 'project_section',
    entityId: name,
    payload: { section: name, projectName: project?.name || '' },
    notifications: memberUserIds.map((memberUserId) => ({
      userId: memberUserId,
      title: `Nouvelle section sur ${project?.name || 'le chantier'}`,
      body: `La section "${name}" a ete ajoutee.`,
      metadata: { section: name, projectName: project?.name || '' },
    })),
  });
};

export const createProjectTaskRecord = async ({ projectId, organizationId, task, sectionIdMap, assigneeIdsByName }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');
  const project = await fetchProjectContext(projectId);

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

  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId: organizationId || project?.organization_id,
    projectId,
    label: 'Tache creee',
    eventKey: 'task.created',
    entityType: 'task',
    entityId: data.id,
    payload: {
      taskTitle: task.title,
      assigneeCount: assigneeRows.length,
    },
    notifications: assigneeRows.map((assignee) => ({
      userId: assignee.user_id,
      title: `Nouvelle tache: ${task.title}`,
      body: `Vous avez ete assigne sur ${project?.name || 'un chantier'}.`,
      metadata: { taskId: data.id, taskTitle: task.title, projectName: project?.name || '' },
    })),
  });
};

export const updateTaskRecord = async ({ taskId, updates, projectId, sectionIdMap }) => {
  const { data: currentTask, error: currentTaskError } = await supabase
    .from('tasks')
    .select('id, organization_id, project_id, title, description, intervention_type, due_date, priority, status, section_id, created_by')
    .eq('id', taskId)
    .single();
  if (currentTaskError) throw currentTaskError;

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
  const effectiveProjectId = projectId || currentTask.project_id;
  const project = effectiveProjectId ?await fetchProjectContext(effectiveProjectId) : null;
  const { data: assignees, error: assigneesError } = await supabase.from('task_assignees').select('user_id').eq('task_id', taskId);
  if (assigneesError) throw assigneesError;
  const actor = await getCurrentUser();
  const changes = diffFields(currentTask, { ...currentTask, ...payload });
  await recordWorkspaceEvent({
    actorId: actor?.id,
    organizationId: currentTask.organization_id || project?.organization_id || null,
    projectId: effectiveProjectId,
    label: 'Tache mise a jour',
    eventKey: 'task.updated',
    entityType: 'task',
    entityId: taskId,
    payload: {
      taskTitle: payload.title || currentTask.title,
      changes,
    },
    notifications: (assignees ?? []).map((assignee) => ({
      userId: assignee.user_id,
      title: `Tache mise a jour: ${payload.title || currentTask.title}`,
      body: `Changements: ${summarizeChanges(changes) || 'mise a jour generale'}.`,
      metadata: { taskId, taskTitle: payload.title || currentTask.title, changes, projectName: project?.name || '' },
    })),
  });
};

export const deleteTaskRecord = async (taskId) => {
  const { data: currentTask, error: currentTaskError } = await supabase
    .from('tasks')
    .select('id, organization_id, project_id, title')
    .eq('id', taskId)
    .single();
  if (currentTaskError) throw currentTaskError;
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
  const actor = await getCurrentUser();
  const project = currentTask.project_id ?await fetchProjectContext(currentTask.project_id) : null;
  await recordWorkspaceEvent({
    actorId: actor?.id,
    organizationId: currentTask.organization_id || project?.organization_id || null,
    projectId: currentTask.project_id,
    label: 'Tache supprimee',
    eventKey: 'task.deleted',
    entityType: 'task',
    entityId: taskId,
    tone: 'warning',
    payload: { taskTitle: currentTask.title },
  });
};

export const archiveProjectRecord = async (projectId, archived) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connectA.');
  const project = await fetchProjectContext(projectId);
  const payload = archived
    ? { archived_at: new Date().toISOString(), archived_by: user.id }
    : { archived_at: null, archived_by: null };
  const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
  if (error) throw error;
  const memberUserIds = await fetchProjectMemberUserIds(projectId);
  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId: project?.organization_id,
    projectId,
    label: archived ? 'Chantier archive' : 'Chantier restaure',
    eventKey: archived ? 'project.archived' : 'project.restored',
    entityType: 'project',
    entityId: projectId,
    tone: archived ? 'warning' : 'info',
    payload: {
      projectName: project?.name || 'Chantier',
    },
    notifications: memberUserIds.map((memberUserId) => ({
      userId: memberUserId,
      title: `${archived ? 'Chantier archive' : 'Chantier restaure'}: ${project?.name || 'Chantier'}`,
      body: archived ? 'Le chantier a ete archive.' : 'Le chantier est de nouveau actif.',
      metadata: { projectName: project?.name || '' },
    })),
  });
};

export const archiveTaskRecord = async ({ taskId, archived, projectId }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connectA.');
  const { data: currentTask, error: currentTaskError } = await supabase
    .from('tasks')
    .select('id, organization_id, project_id, title')
    .eq('id', taskId)
    .single();
  if (currentTaskError) throw currentTaskError;
  const payload = archived
    ? { archived_at: new Date().toISOString(), archived_by: user.id, status: 'archived' }
    : { archived_at: null, archived_by: null, status: 'todo' };
  const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
  if (error) throw error;
  const effectiveProjectId = projectId || currentTask.project_id;
  const project = effectiveProjectId ?await fetchProjectContext(effectiveProjectId) : null;
  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId: currentTask.organization_id || project?.organization_id || null,
    projectId: effectiveProjectId,
    label: archived ? 'Tache archivee' : 'Tache restauree',
    eventKey: archived ? 'task.archived' : 'task.restored',
    entityType: 'task',
    entityId: taskId,
    tone: archived ? 'warning' : 'info',
    payload: { taskTitle: currentTask.title },
  });
};

export const archiveDocumentRecord = async ({ documentId, archived, projectId }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connectA.');
  const { data: document, error: documentFetchError } = await supabase
    .from('documents')
    .select('id, project_id, title')
    .eq('id', documentId)
    .single();
  if (documentFetchError) throw documentFetchError;
  const payload = archived
    ? { archived_at: new Date().toISOString(), archived_by: user.id }
    : { archived_at: null, archived_by: null };
  const { error } = await supabase.from('documents').update(payload).eq('id', documentId);
  if (error) throw error;
  const effectiveProjectId = projectId || document.project_id;
  const project = effectiveProjectId ?await fetchProjectContext(effectiveProjectId) : null;
  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId: project?.organization_id || null,
    projectId: effectiveProjectId,
    label: archived ? 'Document archive' : 'Document restaure',
    eventKey: archived ? 'document.archived' : 'document.restored',
    entityType: 'document',
    entityId: documentId,
    tone: archived ? 'warning' : 'info',
    payload: { documentTitle: document.title },
  });
};

export const archivePlanRecord = async ({ planId, archived, projectId }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connectA.');
  const { data: plan, error: planFetchError } = await supabase
    .from('plans')
    .select('id, project_id, title')
    .eq('id', planId)
    .single();
  if (planFetchError) throw planFetchError;
  const payload = archived
    ? { archived_at: new Date().toISOString(), archived_by: user.id }
    : { archived_at: null, archived_by: null };
  const { error } = await supabase.from('plans').update(payload).eq('id', planId);
  if (error) throw error;
  const effectiveProjectId = projectId || plan.project_id;
  const project = effectiveProjectId ?await fetchProjectContext(effectiveProjectId) : null;
  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId: project?.organization_id || null,
    projectId: effectiveProjectId,
    label: archived ? 'Plan archive' : 'Plan restaure',
    eventKey: archived ? 'plan.archived' : 'plan.restored',
    entityType: 'plan',
    entityId: planId,
    tone: archived ? 'warning' : 'info',
    payload: { planTitle: plan.title },
  });
};

export const savePersonalTaskRecord = async ({ task, organizationId }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connect?.');
  const organizationContext = organizationId ? { organizationId, user } : await getPrimaryOrganizationContext();

  const { data, error } = await supabase
    .from('tasks')
    .insert({
    organization_id: organizationContext.organizationId,
    title: task.title.trim(),
    due_date: task.dueDate || null,
    priority: reverseTaskPriorityMap[task.priority] || 'medium',
    status: 'todo',
    source_label: task.source || 'Personnel',
    created_by: user.id,
  })
    .select('id')
    .single();
  if (error) throw error;
  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId: organizationContext.organizationId,
    label: 'Tache personnelle creee',
    eventKey: 'personal_task.created',
    entityType: 'task',
    entityId: data.id,
    payload: {
      taskTitle: task.title.trim(),
      source: task.source || 'Personnel',
    },
  });
};

export const upsertProjectDocumentRecord = async ({ projectId, doc, kind }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');
  let existingDocument = null;
  if (doc.id) {
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, category, subcategory, version_label, status, document_date, file_name')
      .eq('id', doc.id)
      .single();
    if (error) throw error;
    existingDocument = data;
  }
  const project = await fetchProjectContext(projectId);

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

  const memberUserIds = await fetchProjectMemberUserIds(projectId);
  const changes = existingDocument ?diffFields(existingDocument, payload) : [];
  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId: project?.organization_id,
    projectId,
    label: existingDocument ? 'Document mis a jour' : 'Document cree',
    eventKey: existingDocument ? 'document.updated' : 'document.created',
    entityType: 'document',
    entityId: doc.id || payload.title,
    payload: {
      title: payload.title,
      kind,
      changes,
    },
    notifications: memberUserIds.map((memberUserId) => ({
      userId: memberUserId,
      title: `${existingDocument ? 'Document mis a jour' : 'Nouveau document'}: ${payload.title}`,
      body: existingDocument
        ?`Changements: ${summarizeChanges(changes) || 'mise a jour generale'}.`
        : `Type: ${kind}.`,
      metadata: { title: payload.title, kind, changes, projectName: project?.name || '' },
    })),
  });
};

export const upsertPlanRecord = async ({ projectId, plan }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');
  const project = await fetchProjectContext(projectId);

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
  const memberUserIds = await fetchProjectMemberUserIds(projectId);
  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId: project?.organization_id,
    projectId,
    label: plan.id ? 'Plan mis a jour' : 'Plan cree',
    eventKey: plan.id ? 'plan.updated' : 'plan.created',
    entityType: 'plan',
    entityId: planId,
    payload: {
      planName: plan.name,
      version: nextVersion,
    },
    notifications: memberUserIds.map((memberUserId) => ({
      userId: memberUserId,
      title: `${plan.id ? 'Plan mis a jour' : 'Nouveau plan'}: ${plan.name}`,
      body: `Version ${nextVersion} disponible.`,
      metadata: { planId, planName: plan.name, version: nextVersion, projectName: project?.name || '' },
    })),
  });
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

  const actor = await getCurrentUser();
  await recordWorkspaceEvent({
    actorId: actor?.id,
    organizationId,
    projectId: null,
    label: 'Discussion privee creee',
    eventKey: 'conversation.direct_created',
    entityType: 'conversation',
    entityId: data.id,
    payload: {
      conversationId: data.id,
      participantId: friend.userId || null,
      participantName: friend.name,
    },
    notifications: friend.userId
      ?[
        {
          userId: friend.userId,
          title: 'Nouvelle discussion privee',
          body: `${friend.name ? `Discussion avec ${friend.name}` : 'Une discussion a ete ouverte avec vous'}.`,
          metadata: { conversationId: data.id },
        },
      ]
      : [],
  });

  return data.id;
};

export const sendConversationMessageRecord = async ({ conversationId, text, file = null }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');
  const profile = await fetchProfile(user.id);
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('id, title, organization_id, project_id')
    .eq('id', conversationId)
    .single();
  if (conversationError) throw conversationError;

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

  const { data: members, error: membersError } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId);
  if (membersError) throw membersError;

  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId: conversation.organization_id,
    projectId: conversation.project_id,
    label: 'Message envoye',
    eventKey: 'message.sent',
    entityType: 'message',
    entityId: conversationId,
    payload: {
      conversationId,
      hasAttachment: Boolean(attachment),
      preview: String(text || attachment?.file_name || '').slice(0, 120),
    },
    notifications: (members ?? []).map((member) => ({
      userId: member.user_id,
      title: conversation.project_id ? `Nouveau message sur ${conversation.title || 'le chantier'}` : 'Nouveau message prive',
      body: text || (attachment ? `Piece jointe: ${attachment.file_name}` : 'Nouveau message'),
      metadata: { conversationId, projectId: conversation.project_id },
    })),
  });
};

export const inviteFriendRecord = async ({ name, email, trade }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Utilisateur non connecte.');
  const memberships = await fetchOrganizationMemberships(user.id);
  const organizationId = memberships[0]?.organization_id || null;

  const requesterProfile = await fetchProfile(user.id);
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error("L'email de l'ami est requis.");

  const ownEmail = String(requesterProfile.email || user.email || '').trim().toLowerCase();
  if (normalizedEmail === ownEmail) {
    throw new Error("Vous ne pouvez pas vous inviter vous-meme.");
  }

  const addresseeProfile = await fetchProfileByEmail(normalizedEmail);
  if (!addresseeProfile?.id) {
    throw new Error("Aucun utilisateur n'est associe a cet email.");
  }

  const { data: existing, error: existingError } = await supabase
    .from('friendships')
    .select('id, requester_user_id, addressee_user_id, status')
    .or(
      `and(requester_user_id.eq.${user.id},addressee_user_id.eq.${addresseeProfile.id}),and(requester_user_id.eq.${addresseeProfile.id},addressee_user_id.eq.${user.id})`
    );
  if (existingError) throw existingError;

  const existingRow = (existing ?? [])[0];
  if (existingRow?.status === 'accepted') {
    throw new Error('Ce contact est deja dans vos amis.');
  }
  if (existingRow?.status === 'pending') {
    throw new Error('Une invitation est deja en attente pour ce contact.');
  }

  const payload = {
    requester_user_id: user.id,
    addressee_user_id: addresseeProfile.id,
    requester_name: name?.trim() || requesterProfile.display_name || requesterProfile.email || user.email || 'Contact',
    requester_email: requesterProfile.email || user.email || '',
    requester_trade: trade?.trim() || requesterProfile.specialty || 'Partenaire',
    status: 'pending',
    responded_at: null,
  };

  if (existingRow) {
    const { error } = await supabase.from('friendships').update(payload).eq('id', existingRow.id);
    if (error) throw error;
    await recordWorkspaceEvent({
      actorId: user.id,
      organizationId,
      label: 'Invitation ami renvoyee',
      eventKey: 'friendship.invite_resent',
      entityType: 'friendship',
      entityId: existingRow.id,
      payload: { email: normalizedEmail },
      notifications: [
        {
          userId: addresseeProfile.id,
          title: 'Invitation de contact',
          body: `${payload.requester_name} souhaite vous ajouter.`,
          metadata: { friendshipId: existingRow.id },
        },
      ],
    });
    return existingRow.id;
  }

  const { data, error } = await supabase.from('friendships').insert(payload).select('id').single();
  if (error) throw error;
  await recordWorkspaceEvent({
    actorId: user.id,
    organizationId,
    label: 'Invitation ami envoyee',
    eventKey: 'friendship.invited',
    entityType: 'friendship',
    entityId: data.id,
    payload: { email: normalizedEmail },
    notifications: [
      {
        userId: addresseeProfile.id,
        title: 'Nouvelle invitation de contact',
        body: `${payload.requester_name} souhaite vous ajouter.`,
        metadata: { friendshipId: data.id },
      },
    ],
  });
  return data.id;
};

export const respondToFriendInvitationRecord = async ({ friendshipId, decision }) => {
  const nextStatus = decision === 'accepted' ? 'accepted' : 'refused';
  const { data: friendship, error: friendshipFetchError } = await supabase
    .from('friendships')
    .select('id, requester_user_id, addressee_user_id')
    .eq('id', friendshipId)
    .single();
  if (friendshipFetchError) throw friendshipFetchError;
  const { error } = await supabase
    .from('friendships')
    .update({ status: nextStatus, responded_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw error;
  const actor = await getCurrentUser();
  const memberships = actor?.id ? await fetchOrganizationMemberships(actor.id) : [];
  const organizationId = memberships[0]?.organization_id || null;
  await recordWorkspaceEvent({
    actorId: actor?.id,
    organizationId,
    label: decision === 'accepted' ? 'Invitation ami acceptee' : 'Invitation ami refusee',
    eventKey: decision === 'accepted' ? 'friendship.accepted' : 'friendship.refused',
    entityType: 'friendship',
    entityId: friendshipId,
    payload: { decision },
    notifications: friendship.requester_user_id
      ?[
        {
          userId: friendship.requester_user_id,
          title: decision === 'accepted' ? 'Invitation de contact acceptee' : 'Invitation de contact refusee',
          body: decision === 'accepted' ? 'Votre demande a ete acceptee.' : 'Votre demande a ete refusee.',
          metadata: { friendshipId, decision },
        },
      ]
      : [],
  });
};

export const removeFriendRecord = async ({ friendshipId }) => {
  const { data: friendship, error: friendshipFetchError } = await supabase
    .from('friendships')
    .select('id, requester_user_id, addressee_user_id')
    .eq('id', friendshipId)
    .single();
  if (friendshipFetchError) throw friendshipFetchError;
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
  const actor = await getCurrentUser();
  const memberships = actor?.id ? await fetchOrganizationMemberships(actor.id) : [];
  const organizationId = memberships[0]?.organization_id || null;
  const otherUserId =
    friendship.requester_user_id === actor?.id ?friendship.addressee_user_id : friendship.requester_user_id;
  await recordWorkspaceEvent({
    actorId: actor?.id,
    organizationId,
    label: 'Contact supprime',
    eventKey: 'friendship.deleted',
    entityType: 'friendship',
    entityId: friendshipId,
    tone: 'warning',
    payload: { friendshipId },
    notifications: otherUserId
      ?[
        {
          userId: otherUserId,
          title: 'Relation de contact supprimee',
          body: 'Le contact a ete retire.',
          metadata: { friendshipId },
        },
      ]
      : [],
  });
};

export const respondToProjectInvitationRecord = async ({ invitationId, decision }) => {
  const { data: invitation, error: invitationFetchError } = await supabase
    .from('project_invitations')
    .select('id, project_id, invited_by, email, projects(name, organization_id)')
    .eq('id', invitationId)
    .single();
  if (invitationFetchError) throw invitationFetchError;
  const { error } = await supabase.rpc('respond_to_project_invitation', {
    invitation_id: invitationId,
    decision,
  });
  if (error) throw error;
  const actor = await getCurrentUser();
  await recordWorkspaceEvent({
    actorId: actor?.id,
    organizationId: invitation.projects?.organization_id || null,
    projectId: invitation.project_id,
    label: decision === 'accepted' ? 'Invitation chantier acceptee' : 'Invitation chantier refusee',
    eventKey: decision === 'accepted' ? 'project.invitation_accepted' : 'project.invitation_refused',
    entityType: 'project_invitation',
    entityId: invitationId,
    payload: {
      decision,
      projectName: invitation.projects?.name || 'Chantier',
      email: invitation.email,
    },
    notifications: invitation.invited_by
      ?[
        {
          userId: invitation.invited_by,
          title: `Invitation ${decision === 'accepted' ? 'acceptee' : 'refusee'}: ${invitation.projects?.name || 'Chantier'}`,
          body: `${invitation.email} a ${decision === 'accepted' ? 'accepte' : 'refuse'} l invitation.`,
          metadata: { invitationId, decision, projectName: invitation.projects?.name || '' },
        },
      ]
      : [],
  });
};
