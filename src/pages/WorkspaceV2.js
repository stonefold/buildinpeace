import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import WorkspaceLoader from '../components/WorkspaceLoader';
import { Canvas as FabricCanvas, Circle as FabricCircle, FabricImage, Group as FabricGroup, Rect as FabricRect, Textbox } from 'fabric';
import {
  faArrowLeft,
  faArrowDown,
  faArrowUp,
  faBell,
  faBoxArchive,
  faBuilding,
  faCamera,
  faChevronDown,
  faCircleInfo,
  faClipboardList,
  faComments,
  faEye,
  faFile,
  faFileCircleCheck,
  faFolderOpen,
  faImage,
  faLayerGroup,
  faLocationDot,
  faPlus,
  faPaperclip,
  faPaperPlane,
  faTrash,
  faUserGear,
  faUserFriends,
  faUserPlus,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { emptyWorkspace } from '../data/workspaceDefaults';
import { useWorkspaceData } from '../hooks/useWorkspaceData';

let demoWorkspace = emptyWorkspace;

const primaryNav = [
  { id: 'overview', label: 'Pilotage', icon: faLayerGroup },
  { id: 'projects', label: 'Chantiers', icon: faBuilding },
  { id: 'tasks', label: 'Taches', icon: faClipboardList },
  { id: 'messages', label: 'Messages', icon: faComments },
  { id: 'friends', label: 'Amis', icon: faUserFriends },
  { id: 'profile', label: 'Profil', icon: faUserGear },
];

const chantierTabs = [
  { id: 'Administratif', label: 'Administratif', mobileLabel: 'Administratif', icon: faFileCircleCheck, description: 'Contrats et pieces officielles' },
  { id: 'Documents', label: 'Documents', mobileLabel: 'Documents', icon: faFolderOpen, description: 'Photos, fichiers et suivis' },
  { id: 'Plan', label: 'Plan', mobileLabel: 'Plan', icon: faLayerGroup, description: 'Plans et versions annotees' },
  { id: 'Taches', label: 'Taches', mobileLabel: 'Taches', icon: faClipboardList, description: 'Avancement et priorites' },
  { id: 'Acteurs', label: 'Acteurs', mobileLabel: 'Equipes', icon: faUsers, description: 'Participants et coordination' },
];

const roleOptions = ['Gestionnaire', 'Entrepreneur', 'Architecte', 'Client', 'Ouvrier', 'Sous-traitant'];

const roleAliases = {
  Cliente: 'Client',
};

const rolePermissions = {
  Gestionnaire: {
    tabs: ['Administratif', 'Documents', 'Plan', 'Taches', 'Acteurs'],
    createProject: true,
    manageAccess: true,
    inviteParticipant: true,
    createSection: true,
    createTask: true,
    updateTask: true,
    deleteTask: true,
    addAdminDoc: true,
    addDocument: true,
    addPlan: true,
  },
  Entrepreneur: {
    tabs: ['Administratif', 'Documents', 'Plan', 'Taches', 'Acteurs'],
    createProject: false,
    manageAccess: false,
    inviteParticipant: false,
    createSection: true,
    createTask: true,
    updateTask: true,
    deleteTask: false,
    addAdminDoc: true,
    addDocument: true,
    addPlan: true,
  },
  Architecte: {
    tabs: ['Administratif', 'Documents', 'Plan', 'Taches', 'Acteurs'],
    createProject: false,
    manageAccess: false,
    inviteParticipant: false,
    createSection: false,
    createTask: true,
    updateTask: true,
    deleteTask: false,
    addAdminDoc: false,
    addDocument: true,
    addPlan: true,
  },
  Client: {
    tabs: ['Administratif', 'Documents', 'Plan', 'Acteurs'],
    createProject: false,
    manageAccess: false,
    inviteParticipant: false,
    createSection: false,
    createTask: false,
    updateTask: false,
    deleteTask: false,
    addAdminDoc: false,
    addDocument: false,
    addPlan: false,
  },
  Ouvrier: {
    tabs: ['Documents', 'Plan', 'Taches', 'Acteurs'],
    createProject: false,
    manageAccess: false,
    inviteParticipant: false,
    createSection: false,
    createTask: false,
    updateTask: true,
    deleteTask: false,
    addAdminDoc: false,
    addDocument: false,
    addPlan: false,
  },
  'Sous-traitant': {
    tabs: ['Documents', 'Plan', 'Taches', 'Acteurs'],
    createProject: false,
    manageAccess: false,
    inviteParticipant: false,
    createSection: false,
    createTask: false,
    updateTask: true,
    deleteTask: false,
    addAdminDoc: false,
    addDocument: false,
    addPlan: false,
  },
};

const tabPermissionMap = {
  Administratif: 'viewAdmin',
  Documents: 'viewDocuments',
  Plan: 'viewPlans',
  Taches: 'viewTasks',
  Acteurs: 'viewActors',
};

const permissionOptions = [
  { key: 'viewAdmin', label: 'Administratif' },
  { key: 'viewDocuments', label: 'Documents' },
  { key: 'viewPlans', label: 'Plan' },
  { key: 'viewTasks', label: 'Taches' },
  { key: 'viewActors', label: 'Acteurs' },
];

const initialProjectForm = {
  name: '',
  client: '',
  site: '',
  budget: '',
  startDate: '',
  endDate: '',
  sectionsInput: '',
};

const initialProjectParticipantForm = {
  name: '',
  email: '',
  company: '',
  role: 'Entrepreneur',
};

const initialAdminDocForm = {
  id: null,
  type: 'Offres',
  title: '',
  date: '',
  status: 'En cours',
  fileName: '',
};

const adminDocTypeOptions = ['Offres', 'Factures', 'Contrats', 'Assurances', 'Avancement'];
const adminDocStatusOptions = ['En cours', 'Envoye'];
const adminDocCreateLabels = {
  Offres: 'Ajouter Offre',
  Factures: 'Ajouter Facture',
  Contrats: 'Ajouter Contrat',
  Assurances: 'Ajouter Assurance',
  Avancement: 'Ajouter Avancement',
};

const normalizeAdminDocStatus = (status) => {
  if (['Validee', 'Signe', 'Active', 'Publie', 'Envoye'].includes(status)) {
    return 'Envoye';
  }

  return 'En cours';
};

const initialDocumentForm = {
  id: null,
  category: '',
  subcategory: '',
  name: '',
  version: 'v1',
  status: 'Publie',
  fileName: '',
};

const initialPlanForm = {
  id: null,
  name: '',
  version: 1,
  updatedAt: '',
  pins: 0,
  fileName: '',
  imageUrl: '',
  annotations: [],
  versions: [],
};

const planToolPresets = [
  { id: 'prise', label: 'Prise', short: 'PR', type: 'marker', color: '#2563eb' },
  { id: 'electricite', label: 'Elec', short: 'ELC', type: 'marker', color: '#d97706' },
  { id: 'interrupteur', label: 'Inter.', short: 'INT', type: 'marker', color: '#0f766e' },
  { id: 'luminaire', label: 'Lumiere', short: 'LUM', type: 'marker', color: '#d97706' },
  { id: 'eau', label: 'Eau', short: 'EAU', type: 'marker', color: '#0284c7' },
  { id: 'evacuation', label: 'Evac.', short: 'EV', type: 'marker', color: '#7c3aed' },
  { id: 'reserve', label: 'Reserve', short: 'RSV', type: 'marker', color: '#dc2626' },
  { id: 'cercle', label: 'Cercle', short: 'O', type: 'circle', color: '#dc2626' },
  { id: 'cote', label: 'Cote', short: 'C', type: 'text', color: '#1f2937', text: 'Cote' },
  { id: 'zone', label: 'Zone', short: 'ZN', type: 'rect', color: '#2563eb' },
  { id: 'note', label: 'Note', short: 'N', type: 'text', color: '#111827', text: 'Note' },
];

const getNormalizedRole = (role) => roleAliases[role] ?? role ?? '';
const taskStatusOptions = [
  { id: 'A faire', label: 'A faire' },
  { id: 'En cours', label: 'En cours' },
  { id: 'Terminee', label: 'Terminees' },
];

const getMobileTaskStatusLabel = (status) => {
  if (status === 'A faire') return 'A faire';
  if (status === 'En cours') return 'En cours';
  if (status === 'Terminee') return 'OK';
  return status;
};

const getTaskStatus = (task) => {
  if (task.status === 'Terminee' || task.completed) {
    return 'Terminee';
  }
  if (task.status === 'En cours') {
    return 'En cours';
  }
  return 'A faire';
};

const getTaskStatusBadgeClass = (task) => {
  const status = getTaskStatus(task);
  if (status === 'Terminee') return 'pill-task-done';
  if (status === 'En cours') return 'pill-task-progress';
  return 'pill-task-todo';
};

const getTaskPriorityLabel = (priority) => {
  if (priority === 'Haute' || priority === 'Urgent') return 'Urgent';
  if (priority === 'Moyenne' || priority === 'Basse' || priority === 'Pas urgent') return 'Pas urgent';
  return priority || 'Pas urgent';
};

const getTaskPriorityBadgeClass = (priority) => {
  if (getTaskPriorityLabel(priority) === 'Urgent') return 'pill-priority-urgent';
  return 'pill-priority-neutral';
};

const getTaskPriorityRibbonClass = (priority) => {
  if (getTaskPriorityLabel(priority) === 'Urgent') return 'task-priority-banner priority-urgent';
  return 'task-priority-banner priority-neutral';
};

const getTaskStatusToneClass = (status) => {
  if (status === 'Terminee') return 'task-tone-done';
  if (status === 'En cours') return 'task-tone-progress';
  return 'task-tone-todo';
};

const updateTaskStatus = (task, status) => ({
  ...task,
  status,
  completed: status === 'Terminee',
});

const buildPermissionsForRole = (role) => {
  const roleConfig = rolePermissions[getNormalizedRole(role)] ?? {};
  const tabs = roleConfig.tabs ?? [];
  return {
    ...roleConfig,
    viewAdmin: tabs.includes('Administratif'),
    viewDocuments: tabs.includes('Documents'),
    viewPlans: tabs.includes('Plan'),
    viewTasks: tabs.includes('Taches'),
    viewActors: tabs.includes('Acteurs'),
    archiveProject: roleConfig.manageAccess ?? false,
    archiveTask: roleConfig.updateTask ?? false,
    archiveDocument: (roleConfig.addDocument || roleConfig.addAdminDoc) ?? false,
    archivePlan: roleConfig.addPlan ?? false,
  };
};

const mergePermissions = (role, customPermissions = {}) => ({
  ...buildPermissionsForRole(role),
  ...(customPermissions ?? {}),
});

function WorkspaceV2({ onSignOut }) {
  const { workspace, isLoading, error, actions } = useWorkspaceData();
  const [isInitialLoaderReady, setIsInitialLoaderReady] = useState(false);
  demoWorkspace = workspace;
  const workspaceRole = getNormalizedRole(workspace.user.role);
  const workspacePermissions = buildPermissionsForRole(workspaceRole);
  const [projects, setProjects] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(emptyWorkspace.user);
  const [activeSection, setActiveSection] = useState('projects');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProjectTab, setActiveProjectTab] = useState('Administratif');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [createStep, setCreateStep] = useState(1);
  const [newProject, setNewProject] = useState(initialProjectForm);
  const [projectParticipants, setProjectParticipants] = useState([]);
  const [newProjectParticipant, setNewProjectParticipant] = useState(initialProjectParticipantForm);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'Entrepreneur' });
  const [taskView, setTaskView] = useState('A faire');
  const [taskLayout, setTaskLayout] = useState('list');
  const [openSections, setOpenSections] = useState({});
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskStep, setTaskStep] = useState(1);
  const [preferredConversationId, setPreferredConversationId] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    interventionType: '',
    dueDate: '',
    section: '',
    assignees: [],
    priority: 'Pas urgent',
  });
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(false);
  const [isInvitationCenterOpen, setIsInvitationCenterOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [localDirectMessages, setLocalDirectMessages] = useState([]);

  useEffect(() => {
    setProjects(workspace.projects);
  }, [workspace.projects]);

  useEffect(() => {
    setCurrentUserProfile(workspace.user);
  }, [workspace.user]);

  useEffect(() => {
    setLocalDirectMessages([]);
  }, [workspace.user.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsInitialLoaderReady(true);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const availableFriends = useMemo(() => workspace.friends ?? [], [workspace.friends]);

  const availableDirectMessages = useMemo(() => {
    const map = new Map();
    [...(workspace.directMessages ?? []), ...localDirectMessages].forEach((conversation) => {
      map.set(conversation.id, conversation);
    });
    return [...map.values()];
  }, [localDirectMessages, workspace.directMessages]);
  const notifications = useMemo(() => workspace.notifications ?? [], [workspace.notifications]);
  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const startupScreen = isLoading || !isInitialLoaderReady ?(
    <WorkspaceLoader
      eyebrow="Workspace"
      title="Build In Peace"
      message="Chargement du workspace..."
      detail="Preparation des chantiers, notifications, documents et conversations en temps reel."
    />
  ) : error ?(
    <main className="workspace-auth-screen">
      <section className="workspace-auth-card">
        <h1>Build In Peace</h1>
        <p>{error.message || 'Impossible de charger les donnees.'}</p>
      </section>
    </main>
  ) : null;

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects]
  );

  const overviewStats = useMemo(() => {
    const normalizeStatus = (value) =>
      (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const activeProjects = projects.filter((project) => !project.archived);
    const personalOpenTasks = (workspace.personalTasks ?? []).filter((task) => !task.archived && !task.completed).length;
    const projectOpenTasks = projects.reduce(
      (total, project) => total + (project.tasks ?? []).filter((task) => !task.archived && !task.completed).length,
      0
    );
    const pendingDocs = projects.reduce(
      (total, project) =>
        total +
        [...(project.documents ?? []), ...(project.adminDocs ?? [])].filter(
          (doc) => !doc.archived && ['a verifier', 'en revision', 'en attente'].includes(normalizeStatus(doc.status))
        ).length,
      0
    );
    const projectMessageCount = projects.reduce(
      (total, project) => total + (project.conversations ?? []).reduce((sum, conversation) => sum + (conversation.messages?.length ?? 0), 0),
      0
    );
    const directMessageCount = availableDirectMessages.reduce((total, conversation) => total + (conversation.messages?.length ?? 0), 0);
    const activeConversationCount =
      projects.reduce((total, project) => total + (project.conversations?.length ?? 0), 0) + availableDirectMessages.length;

    return [
      { label: 'Chantiers actifs', value: activeProjects.length, detail: `${projects.length} chantiers visibles` },
      { label: 'Taches a traiter', value: personalOpenTasks + projectOpenTasks, detail: `${(workspace.personalTasks ?? []).length} personnelles` },
      { label: 'Documents a valider', value: pendingDocs, detail: 'Documents et administratif' },
      { label: 'Messages non lus', value: projectMessageCount + directMessageCount, detail: `${activeConversationCount} conversations actives` },
    ];
  }, [availableDirectMessages, projects, workspace.personalTasks]);

  const currentParticipant = useMemo(
    () => activeProject?.participants.find((participant) => participant.name === demoWorkspace.user.name),
    [activeProject]
  );

  const currentRole = useMemo(() => getNormalizedRole(currentParticipant?.role), [currentParticipant]);

  const availableTabs = useMemo(() => {
    if (!currentRole) {
      return [];
    }
    const permissions = mergePermissions(currentRole, currentParticipant?.permissions);
    return chantierTabs.filter((tab) => permissions[tabPermissionMap[tab.id]]).map((tab) => tab.id);
  }, [currentParticipant?.permissions, currentRole]);

  const projectPermissions = useMemo(() => {
    if (!currentRole) {
      return {};
    }
    return mergePermissions(currentRole, currentParticipant?.permissions);
  }, [currentParticipant?.permissions, currentRole]);

  useEffect(() => {
    if (!availableTabs.length) {
      return;
    }
    if (!availableTabs.includes(activeProjectTab)) {
      setActiveProjectTab(availableTabs[0]);
    }
  }, [activeProjectTab, availableTabs]);

  useEffect(() => {
    if (!activeProject?.sections) {
      setOpenSections({});
      return;
    }
    setOpenSections((current) => {
      const next = { ...current };
      activeProject.sections.forEach((section) => {
        if (typeof next[section] === 'undefined') {
          next[section] = true;
        }
      });
      return next;
    });
  }, [activeProject]);

  const canManageProject = Boolean(projectPermissions.manageAccess);

  const markUnreadNotificationsAsRead = async () => {
    const unreadIds = notifications.filter((notification) => !notification.isRead).map((notification) => notification.id);
    if (!unreadIds.length) {
      return;
    }
    await actions.markNotificationsRead(unreadIds);
  };

  const openProject = (projectId) => {
    setActiveProjectId(projectId);
    setActiveProjectTab('Taches');
    setActiveSection('projects');
  };

  const closeProject = () => {
    setPreferredConversationId(null);
    setActiveProjectTab('Administratif');
    setOpenSections({});
    setActiveProjectId(null);
    setActiveSection('projects');
  };

  const openPrivateDiscussionWithFriend = async (friend) => {
    if (friend.localOnly) {
      const localConversationId = friend.conversationId || `local-conversation-${friend.id}`;
      setLocalDirectMessages((current) => {
        if (current.some((item) => item.id === localConversationId)) return current;
        return [
          {
            id: localConversationId,
            name: friend.name,
            preview: 'Discussion demarree.',
            unread: 0,
            updatedAt: new Date().toISOString(),
            messages: [],
          },
          ...current,
        ];
      });
      setPreferredConversationId(localConversationId);
      setActiveSection('messages');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!workspace.organization?.id || !workspace.user.id) {
      return;
    }

    const conversationId = await actions.ensureDirectConversation({
      organizationId: workspace.organization?.id,
      currentUserId: workspace.user.id,
      projectId: null,
      friend,
    });

    setPreferredConversationId(conversationId);
    setActiveSection('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sendDirectMessage = async (payload) => {
    if (String(payload.conversationId || '').startsWith('local-conversation-')) {
      const time = new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
      setLocalDirectMessages((current) =>
        current.map((conversation) =>
          conversation.id !== payload.conversationId
            ? conversation
            : {
                ...conversation,
                preview: payload.text || (payload.file ? payload.file.name : conversation.preview),
                updatedAt: new Date().toISOString(),
                messages: [
                  ...(conversation.messages ?? []),
                  {
                    id: `${conversation.id}-${Date.now()}`,
                    author: currentUserProfile.name || 'Vous',
                    text: payload.text || (payload.file ? `Piece jointe : ${payload.file.name}` : ''),
                    time,
                    timestamp: new Date().toISOString(),
                    own: true,
                    status: 'Envoye',
                    attachment: payload.file
                      ? {
                          name: payload.file.name,
                          kind: payload.file.type?.startsWith('image/') ? 'image' : 'file',
                          sizeLabel: `${Math.max(1, Math.round(payload.file.size / 1024))} Ko`,
                          url: URL.createObjectURL(payload.file),
                        }
                      : null,
                  },
                ],
              }
        )
      );
      return true;
    }

    return actions.sendMessage(payload);
  };

  const inviteFriend = ({ name, email, trade }) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || !cleanEmail) return;

    actions.inviteFriend({
      name: cleanName,
      email: cleanEmail,
      trade: trade.trim() || 'Partenaire',
    });
  };

  const respondToFriendInvitation = async (inviteId, decision) => {
    await actions.respondToFriendInvitation({ friendshipId: inviteId, decision });
  };

  const removeFriend = async (friend) => {
    if (!friend?.friendshipId) return;
    await actions.removeFriend({ friendshipId: friend.friendshipId });
  };

  const moveProject = (projectId, direction) => {
    setProjects((currentProjects) => {
      const index = currentProjects.findIndex((project) => project.id === projectId);
      if (index === -1) {
        return currentProjects;
      }
      const nextIndex = direction === 'up' ?index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= currentProjects.length) {
        return currentProjects;
      }
      const nextProjects = [...currentProjects];
      const [project] = nextProjects.splice(index, 1);
      nextProjects.splice(nextIndex, 0, project);
      return nextProjects;
    });
  };

  const openCreateProject = () => {
    if (!workspacePermissions.createProject) {
      return;
    }
    setEditingProjectId(null);
    setNewProject(initialProjectForm);
    setProjectParticipants([
      {
        id: `participant-owner-${Date.now()}`,
        name: demoWorkspace.user.name,
        email: demoWorkspace.user.email,
        company: demoWorkspace.user.company,
        role: 'Gestionnaire',
        status: 'Actif',
        locked: true,
      },
    ]);
    setNewProjectParticipant(initialProjectParticipantForm);
    setCreateStep(1);
    setIsCreateModalOpen(true);
  };

  const openEditProject = (projectId = activeProjectId) => {
    const projectToEdit = projects.find((project) => project.id === projectId);
    if (!projectToEdit) {
      return;
    }
    setEditingProjectId(projectToEdit.id);
    setNewProject({
      name: projectToEdit.name ?? '',
      client: projectToEdit.client ?? '',
      site: projectToEdit.site ?? '',
      budget: projectToEdit.budget ?? '',
      startDate: projectToEdit.startDate ?? '',
      endDate: projectToEdit.endDate ?? '',
      sectionsInput: (projectToEdit.sections ?? []).join(', '),
    });
    setProjectParticipants(
      (projectToEdit.participants ?? []).map((participant) => ({
        ...participant,
        email: participant.email ?? '',
        locked: participant.name === demoWorkspace.user.name,
      }))
    );
    setNewProjectParticipant(initialProjectParticipantForm);
    setCreateStep(1);
    setIsCreateModalOpen(true);
  };

  const addProjectParticipant = () => {
    if (!newProjectParticipant.name.trim()) {
      return;
    }

    setProjectParticipants((current) => [
      ...current,
      {
        id: `participant-${Date.now()}`,
        name: newProjectParticipant.name.trim(),
        email: newProjectParticipant.email.trim(),
        company: newProjectParticipant.company.trim() || 'Entreprise a preciser',
        role: getNormalizedRole(newProjectParticipant.role),
        status: 'Invite',
      },
    ]);
    setNewProjectParticipant(initialProjectParticipantForm);
  };

  const removeProjectParticipant = (participantId) => {
    setProjectParticipants((current) =>
      current.filter((participant) => participant.id !== participantId || participant.locked)
    );
  };

  const handleCreateProject = async () => {
    const { name, client, site, budget, startDate, endDate } = newProject;
    const existingProject = projects.find((project) => project.id === editingProjectId) ?? null;
    if (!name.trim() || !projectParticipants.length || !site.trim() || !startDate || !endDate) {
      return;
    }

    const normalizedSections = (existingProject?.sections ?? []).map((section) => section.trim()).filter(Boolean);

    const createdProject = {
      id: editingProjectId ?? `project-${Date.now()}`,
      name: name.trim(),
      client: client.trim() || 'Client a preciser',
      site: site.trim(),
      status: existingProject?.status ?? 'Preparation',
      progress: existingProject?.progress ?? 0,
      budget: budget.trim() || 'A definir',
      startDate,
      endDate,
      period: `${startDate} -> ${endDate}`,
      participants: projectParticipants.map(({ locked, email, ...participant }) => participant),
      sections: normalizedSections.length ? normalizedSections : ['General chantier'],
      adminDocs: existingProject?.adminDocs ?? [],
      documents: existingProject?.documents ?? [],
      plans: existingProject?.plans ?? [],
      tasks: existingProject?.tasks ?? [],
      conversations: existingProject?.conversations ?? [],
      timeline: existingProject?.timeline ?? [{ id: `timeline-${Date.now()}`, label: 'Chantier cree', date: startDate, tone: 'info' }],
    };

    setProjects((currentProjects) =>
      editingProjectId
        ?currentProjects.map((project) => (project.id === editingProjectId ?createdProject : project))
        : [createdProject, ...currentProjects]
    );
    setActiveProjectId(createdProject.id);
    await actions.saveProject({
      projectForm: { ...newProject, sectionsInput: normalizedSections.join(', ') },
      participants: projectParticipants.map(({ locked, ...participant }) => participant),
      editingProjectId,
      currentUserProfile,
    });
    setActiveProjectTab('Administratif');
    setNewProject(initialProjectForm);
    setProjectParticipants([]);
    setNewProjectParticipant(initialProjectParticipantForm);
    setEditingProjectId(null);
    setCreateStep(1);
    setIsCreateModalOpen(false);
  };

  const handleInvite = async () => {
    if (!projectPermissions.inviteParticipant || !inviteForm.email.trim() || !activeProject) {
      return;
    }

    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : {
              ...project,
              participants: [
                ...project.participants,
                {
                  id: `participant-${Date.now()}`,
                  name: inviteForm.email,
                  role: getNormalizedRole(inviteForm.role),
                  company: 'Invitation en attente',
                  status: 'Invite',
                },
              ],
            }
      )
    );

    await actions.inviteProjectMember({
      projectId: activeProject.id,
      email: inviteForm.email.trim(),
      role: inviteForm.role,
    });

    setInviteForm({ email: '', role: 'Entrepreneur' });
    setIsInviteModalOpen(false);
  };

  const toggleSection = (section) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const addSection = async () => {
    if (!projectPermissions.createSection || !newSectionName.trim() || !activeProject) {
      return;
    }
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id || project.sections.includes(newSectionName)
          ?project
          : { ...project, sections: [...project.sections, newSectionName] }
      )
    );
    await actions.addProjectSection(activeProject.id, newSectionName.trim());
    setOpenSections((current) => ({ ...current, [newSectionName]: true }));
    setNewSectionName('');
    setIsSectionModalOpen(false);
  };

  const saveTask = async () => {
    if (!projectPermissions.createTask || !activeProject || !newTask.title.trim() || !newTask.section) {
      return;
    }
    const task = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      interventionType: newTask.interventionType,
      dueDate: newTask.dueDate,
      section: newTask.section,
      assignees: newTask.assignees,
      priority: newTask.priority,
      status: 'A faire',
      completed: false,
      archived: false,
    };
    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id !== activeProject.id ?project : { ...project, tasks: [...project.tasks, task] }))
    );
    const assigneeIdsByName = Object.fromEntries(
      (activeProject.participants ?? []).map((participant) => [
        participant.name,
        { userId: participant.userId, displayName: participant.name },
      ])
    );
    const result = await actions.createProjectTask({
      projectId: activeProject.id,
      organizationId: activeProject.organizationId,
      task,
      sectionIdMap: activeProject.sectionIdMap || {},
      assigneeIdsByName,
    });
    if (result === null) {
      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id !== activeProject.id ?project : { ...project, tasks: project.tasks.filter((item) => item.id !== task.id) }
        )
      );
      return;
    }
    setNewTask({
      title: '',
      description: '',
      interventionType: '',
      dueDate: '',
      section: '',
      assignees: [],
      priority: 'Pas urgent',
    });
    setTaskStep(1);
    setIsTaskModalOpen(false);
  };

  const toggleTaskCompleted = async (taskId, nextStatus = null) => {
    if (!projectPermissions.updateTask || !activeProject) {
      return;
    }
    const nextTask = activeProject.tasks.find((task) => task.id === taskId);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id !== taskId
                  ?task
                  : updateTaskStatus(task, nextStatus ?? (getTaskStatus(task) === 'Terminee' ? 'A faire' : 'Terminee'))
              ),
            }
      )
    );
    if (nextTask) {
      await actions.updateTask({
        taskId,
        updates: {
          status: nextStatus ?? (getTaskStatus(nextTask) === 'Terminee' ? 'A faire' : 'Terminee'),
        },
        projectId: activeProject.id,
        sectionIdMap: {},
      });
    }
  };

  const deleteTask = async (taskId) => {
    if (!projectPermissions.deleteTask || !activeProject) {
      return;
    }
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id ?project : { ...project, tasks: project.tasks.filter((task) => task.id !== taskId) }
      )
    );
    await actions.deleteTask(taskId);
  };

  const updateTask = async (taskId, updates) => {
    if (!activeProject) {
      return;
    }
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : {
              ...project,
              tasks: project.tasks.map((task) => (task.id !== taskId ?task : { ...task, ...updates })),
            }
      )
    );
    await actions.updateTask({ taskId, updates, projectId: activeProject.id, sectionIdMap: activeProject.sectionIdMap || {} });
  };

  const upsertAdminDoc = async (doc) => {
    if (!activeProject) {
      return;
    }
    const nextDoc = { ...doc, id: doc.id ?? `ad-${Date.now()}` };
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : {
              ...project,
              adminDocs: doc.id
                ?project.adminDocs.map((item) => (item.id === doc.id ?nextDoc : item))
                : [nextDoc, ...project.adminDocs],
            }
      )
    );
    await actions.upsertAdminDocument({ projectId: activeProject.id, doc });
  };

  const upsertDocument = async (doc) => {
    if (!activeProject) {
      return;
    }
    const nextDoc = { ...doc, id: doc.id ?? `doc-${Date.now()}` };
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : {
              ...project,
              documents: doc.id
                ?project.documents.map((item) => (item.id === doc.id ?nextDoc : item))
                : [nextDoc, ...project.documents],
            }
      )
    );
    await actions.upsertProjectDocument({ projectId: activeProject.id, doc });
  };

  const upsertPlan = async (plan) => {
    if (!activeProject) {
      return;
    }
    const nextPlan = { ...plan, id: plan.id ?? `pl-${Date.now()}` };
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : {
              ...project,
              plans: plan.id
                ?project.plans.map((item) => (item.id === plan.id ?nextPlan : item))
                : [nextPlan, ...project.plans],
            }
      )
    );
    await actions.upsertPlan({ projectId: activeProject.id, plan });
  };

  const toggleProjectArchived = async (projectId, archived) => {
    setProjects((currentProjects) => currentProjects.map((project) => (project.id !== projectId ?project : { ...project, archived })));
    await actions.archiveProject(projectId, archived);
    if (archived && activeProjectId === projectId) {
      closeProject();
    }
  };

  const toggleTaskArchived = async (taskId, archived) => {
    if (!activeProject) {
      return;
    }
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id !== taskId
                  ?task
                  : { ...task, archived, status: archived ? 'Terminee' : task.status }
              ),
            }
      )
    );
    await actions.archiveTask({ taskId, archived, projectId: activeProject.id });
  };

  const toggleDocumentArchived = async (documentId, archived, collection) => {
    if (!activeProject) {
      return;
    }
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : {
              ...project,
              [collection]: project[collection].map((doc) => (doc.id !== documentId ?doc : { ...doc, archived })),
            }
      )
    );
    await actions.archiveDocument({ documentId, archived, projectId: activeProject.id });
  };

  const togglePlanArchived = async (planId, archived) => {
    if (!activeProject) {
      return;
    }
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : { ...project, plans: project.plans.map((plan) => (plan.id !== planId ?plan : { ...plan, archived })) }
      )
    );
    await actions.archivePlan({ planId, archived, projectId: activeProject.id });
  };

  const respondToInvitation = async (invitationId, decision) => {
    await actions.respondToInvitation({ invitationId, decision });
  };

  const saveAccessChanges = async (draftParticipants) => {
    if (!activeProject) {
      return;
    }

    const currentParticipants = activeProject.participants ?? [];
    const currentById = new Map(currentParticipants.map((participant) => [participant.id, participant]));
    const draftById = new Map(draftParticipants.map((participant) => [participant.id, participant]));

    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id !== activeProject.id ?project : { ...project, participants: draftParticipants }))
    );

    for (const participant of currentParticipants) {
      if (!draftById.has(participant.id) && participant.name !== demoWorkspace.user.name) {
        await actions.removeProjectMember(participant.id);
      }
    }

    for (const participant of draftParticipants) {
      const currentParticipant = currentById.get(participant.id);
      if (!currentParticipant) {
        continue;
      }

      if (getNormalizedRole(currentParticipant.role) !== getNormalizedRole(participant.role)) {
        await actions.updateProjectMemberRole(participant.id, participant.role);
      }

      const currentPermissions = currentParticipant.permissions ?? {};
      const nextPermissions = participant.permissions ?? {};
      if (JSON.stringify(currentPermissions) !== JSON.stringify(nextPermissions)) {
        await actions.updateProjectMemberPermissions(participant.id, nextPermissions);
      }
    }

    setIsAccessModalOpen(false);
  };

  return startupScreen || (
    <div className={`app-shell workspace-shell ${isSidebarOpen ? 'is-sidebar-open' : ''}`}>
      <aside
        className="sidebar"
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
      >
        <div className="brand-card">
          <div className="brand-row">
            <img src="/assets/logo.jfif" alt="Build In Peace" className="brand-logo" />
            <h1>Build In Peace</h1>
          </div>
        </div>

        <div className="sidebar-user-card">
          <span className="sidebar-user-avatar">{currentUserProfile.name.slice(0, 2).toUpperCase()}</span>
          <div className="sidebar-user-copy">
            <strong>{currentUserProfile.name}</strong>
            <span>{currentUserProfile.status}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation principale">
          {primaryNav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeSection === item.id ? 'is-active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="nav-item-inner">
                <span className="nav-icon">
                  <FontAwesomeIcon icon={item.icon} />
                </span>
                <span className="nav-label">{item.label}</span>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace-main">
        <div className="workspace-top-actions">
          <button type="button" className="secondary-button compact workspace-top-action-button" onClick={() => setIsNotificationCenterOpen(true)}>
            <FontAwesomeIcon icon={faBell} />
            Notifications
            <span className="pill pill-electric">{unreadNotificationCount}</span>
          </button>
          <button type="button" className="secondary-button compact" onClick={() => setIsInvitationCenterOpen(true)}>
            Invitations chantier
            <span className="pill pill-electric">{workspace.pendingInvitations.filter((item) => item.status === 'pending').length}</span>
          </button>
        </div>
        <section className="content-grid">
          {activeSection === 'overview' && <OverviewSection project={activeProject ?? projects[0]} stats={overviewStats} />}
          {activeSection === 'projects' && (
            <ProjectsSection
              activeProject={activeProject}
              activeProjectId={activeProjectId}
              activeProjectTab={activeProjectTab}
              availableTabs={availableTabs}
              canManageProject={canManageProject}
              currentParticipant={currentParticipant}
              newSectionName={newSectionName}
              newTask={newTask}
              openSections={openSections}
              onBack={closeProject}
              onEditProject={openEditProject}
              onCreateProject={openCreateProject}
              onArchiveDocument={toggleDocumentArchived}
              onArchivePlan={togglePlanArchived}
              onArchiveProject={toggleProjectArchived}
              onArchiveTask={toggleTaskArchived}
              onDeleteTask={deleteTask}
              onInvite={() => setIsInviteModalOpen(true)}
              onMoveProject={moveProject}
              onOpenProject={openProject}
              onOpenSectionModal={() => setIsSectionModalOpen(true)}
              onOpenTaskModal={() => setIsTaskModalOpen(true)}
              onOpenAccessModal={() => setIsAccessModalOpen(true)}
              onOpenProjectInfo={() => setIsProjectInfoOpen(true)}
              onSaveAdminDoc={upsertAdminDoc}
              onSaveDocument={upsertDocument}
              onSavePlan={upsertPlan}
              onSelectTab={setActiveProjectTab}
              onSetNewSectionName={setNewSectionName}
              onSetNewTask={setNewTask}
              onToggleSection={toggleSection}
              onToggleTaskCompleted={toggleTaskCompleted}
              onUpdateTask={updateTask}
              permissions={projectPermissions}
              taskLayout={taskLayout}
              setTaskStep={setTaskStep}
              setTaskLayout={setTaskLayout}
              setTaskView={setTaskView}
              taskStep={taskStep}
              taskView={taskView}
              workspacePermissions={workspacePermissions}
              projects={projects}
            />
          )}
          {activeSection === 'tasks' && (
            <TasksSection
              project={activeProject ?? projects[0]}
              projects={projects}
              personalTasks={workspace.personalTasks}
              organizationId={workspace.organization?.id}
              onSavePersonalTask={(task) => actions.savePersonalTask({ task, organizationId: workspace.organization?.id })}
              onUpdateTask={actions.updateTask}
              onDeleteTask={actions.deleteTask}
              onArchiveTask={actions.archiveTask}
            />
          )}
          {activeSection === 'messages' && (
            <MessagesSection
              directMessages={availableDirectMessages}
              friends={availableFriends}
              preferredConversationId={preferredConversationId}
              currentUserName={currentUserProfile.name}
              onSendMessage={sendDirectMessage}
              onOpenPrivateDiscussion={openPrivateDiscussionWithFriend}
            />
          )}
          {activeSection === 'friends' && (
            <FriendsSection
              friends={availableFriends}
              invitations={workspace.friendInvitations}
              currentUserStatus={currentUserProfile.status}
              onChangeCurrentUserStatus={(status) => setCurrentUserProfile((current) => ({ ...current, status }))}
              onInviteFriend={inviteFriend}
              onOpenPrivateDiscussion={openPrivateDiscussionWithFriend}
              onRemoveFriend={removeFriend}
              onRespondToInvitation={respondToFriendInvitation}
            />
          )}
          {activeSection === 'profile' && (
            <ProfileSection
              profileForm={currentUserProfile}
              onChangeProfile={setCurrentUserProfile}
              onSaveProfile={(profile, avatarFile) => actions.saveProfile(profile, avatarFile)}
              onSignOut={onSignOut}
            />
          )}
        </section>

        <nav className="mobile-nav" aria-label="Navigation mobile">
          {primaryNav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-item ${activeSection === item.id ? 'is-active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <FontAwesomeIcon icon={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {isCreateModalOpen && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-card light-modal">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">{editingProjectId ? 'Modifier' : 'Nouveau chantier'}</p>
                  <h3>{editingProjectId ? 'Modifier le chantier' : 'Ajouter un chantier'}</h3>
                </div>
                <span className="pill pill-electric">Etape {createStep}/4</span>
              </div>

              {createStep === 1 && (
                <div className="form-grid">
                  <label className="field field-full">
                    <span>Nom du chantier <strong className="field-required">*</strong></span>
                    <small className="field-help">Obligatoire. Donne un nom clair pour retrouver facilement le chantier.</small>
                    <input
                      type="text"
                      placeholder="Ex. Renovation maison Lambert"
                      value={newProject.name}
                      onChange={(event) => setNewProject((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>
                </div>
              )}

              {createStep === 2 && (
                <div className="wizard-step-stack">
                  <div className="summary-card field-tip-card">
                    <div className="summary-row">
                      <span>Ajouter une nouvelle personne ici</span>
                      <strong>Les champs marques * sont obligatoires</strong>
                    </div>
                    <small className="field-help">Ajoute chaque intervenant du chantier puis clique sur `Ajouter l'intervenant` pour l'inclure dans la liste.</small>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Nom <strong className="field-required">*</strong></span>
                      <small className="field-help">Obligatoire. Nom de la personne a inviter sur le chantier.</small>
                      <input
                        type="text"
                        value={newProjectParticipant.name}
                        onChange={(event) =>
                          setNewProjectParticipant((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Email <strong className="field-required">*</strong></span>
                      <small className="field-help">Obligatoire. Utilise son adresse mail pour l'identifier correctement.</small>
                      <input
                        type="email"
                        value={newProjectParticipant.email}
                        onChange={(event) =>
                          setNewProjectParticipant((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Entreprise</span>
                      <small className="field-help">Optionnel. Nom de sa societe ou equipe.</small>
                      <input
                        type="text"
                        value={newProjectParticipant.company}
                        onChange={(event) =>
                          setNewProjectParticipant((current) => ({ ...current, company: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Role <strong className="field-required">*</strong></span>
                      <small className="field-help">Obligatoire. Choisis le role de cette personne sur le chantier.</small>
                      <select
                        value={newProjectParticipant.role}
                        onChange={(event) =>
                          setNewProjectParticipant((current) => ({ ...current, role: event.target.value }))
                        }
                      >
                        {roleOptions.map((role) => (
                          <option key={role}>{role}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="modal-actions modal-actions-inline">
                    <button type="button" className="secondary-button" onClick={addProjectParticipant}>
                      <FontAwesomeIcon icon={faUserPlus} />
                      Ajouter cette personne
                    </button>
                  </div>

                  <div className="summary-card participant-summary-list">
                    {projectParticipants.map((participant) => (
                      <div key={participant.id} className="summary-row participant-summary-row">
                        <div className="participant-summary-copy">
                          <strong>{participant.name}</strong>
                          <span>
                            {participant.role}
                            {participant.company ?`  -  ${participant.company}` : ''}
                          </span>
                        </div>
                        {participant.locked ?(
                          <span className="pill pill-neutral">Vous</span>
                        ) : (
                          <button
                            type="button"
                            className="secondary-button compact"
                            onClick={() => removeProjectParticipant(participant.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                            Retirer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {createStep === 3 && (
                <div className="form-grid">
                  <label className="field">
                    <span>Client <strong className="field-required">*</strong></span>
                    <small className="field-help">Obligatoire. Nom du client ou du donneur d'ordre.</small>
                    <input
                      type="text"
                      value={newProject.client}
                      onChange={(event) => setNewProject((current) => ({ ...current, client: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Ville / site <strong className="field-required">*</strong></span>
                    <small className="field-help">Obligatoire. Adresse courte, ville ou nom du site.</small>
                    <input
                      type="text"
                      value={newProject.site}
                      onChange={(event) => setNewProject((current) => ({ ...current, site: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Budget</span>
                    <small className="field-help">Optionnel. Tu peux mettre un budget estimatif.</small>
                    <input
                      type="text"
                      value={newProject.budget}
                      onChange={(event) => setNewProject((current) => ({ ...current, budget: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Date de debut <strong className="field-required">*</strong></span>
                    <small className="field-help">Obligatoire. Date de lancement du chantier.</small>
                    <input
                      type="date"
                      value={newProject.startDate}
                      onChange={(event) => setNewProject((current) => ({ ...current, startDate: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Date de fin <strong className="field-required">*</strong></span>
                    <small className="field-help">Obligatoire. Date de fin prevue.</small>
                    <input
                      type="date"
                      value={newProject.endDate}
                      onChange={(event) => setNewProject((current) => ({ ...current, endDate: event.target.value }))}
                    />
                  </label>
                </div>
              )}

              {createStep === 4 && (
                <div className="summary-card">
                  <div className="summary-row">
                    <span>Nom</span>
                    <strong>{newProject.name || '-'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Intervenants</span>
                    <strong>{projectParticipants.length}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Client</span>
                    <strong>{newProject.client || 'A preciser'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Site</span>
                    <strong>{newProject.site || '-'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Budget</span>
                    <strong>{newProject.budget || 'A definir'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Periode</span>
                    <strong>
                      {newProject.startDate || '-'} -> {newProject.endDate || '-'}
                    </strong>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => (createStep === 1 ?setIsCreateModalOpen(false) : setCreateStep((step) => step - 1))}
                >
                  {createStep === 1 ? 'Annuler' : 'Precedent'}
                </button>
                {createStep < 4 ?(
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => setCreateStep((step) => step + 1)}
                    disabled={
                      (createStep === 1 && !newProject.name.trim()) ||
                      (createStep === 2 && !projectParticipants.length) ||
                      (createStep === 3 && (!newProject.site.trim() || !newProject.startDate || !newProject.endDate))
                    }
                  >
                    Suivant
                  </button>
                ) : (
                  <button type="button" className="action-button" onClick={handleCreateProject}>
                    <FontAwesomeIcon icon={faPlus} />
                    {editingProjectId ? 'Enregistrer le chantier' : 'Creer le chantier'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isInviteModalOpen && activeProject && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-card light-modal">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Inviter</p>
                  <h3>Ajouter un intervenant</h3>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Email de l intervenant</span>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Role</span>
                  <select
                    value={inviteForm.role}
                    onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    {roleOptions
                      .filter((role) => role !== 'Gestionnaire')
                      .map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setIsInviteModalOpen(false)}>
                  Annuler
                </button>
                <button type="button" className="action-button" onClick={handleInvite}>
                  <FontAwesomeIcon icon={faUserPlus} />
                  Inviter
                </button>
              </div>
            </div>
          </div>
        )}

        {isAccessModalOpen && activeProject && (
          <AccessManagementModal
            currentUserName={demoWorkspace.user.name}
            onClose={() => setIsAccessModalOpen(false)}
            onSave={saveAccessChanges}
            participants={activeProject.participants}
          />
        )}

        {isProjectInfoOpen && activeProject ?<ProjectInfoModal onClose={() => setIsProjectInfoOpen(false)} project={activeProject} /> : null}
        {isInvitationCenterOpen ?(
          <InvitationCenterModal
            invitations={workspace.pendingInvitations}
            onClose={() => setIsInvitationCenterOpen(false)}
            onRespond={respondToInvitation}
          />
        ) : null}
        {isNotificationCenterOpen ?(
          <NotificationCenterModal
            notifications={notifications}
            onClose={() => setIsNotificationCenterOpen(false)}
            onMarkAllRead={markUnreadNotificationsAsRead}
          />
        ) : null}

        {isSectionModalOpen && activeProject && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-card light-modal">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Nouvelle tache</p>
                  <h3>Ajouter une tache</h3>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Nom de la section</span>
                  <input type="text" value={newSectionName} onChange={(event) => setNewSectionName(event.target.value)} />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setIsSectionModalOpen(false)}>
                  Annuler
                </button>
                <button type="button" className="action-button" onClick={addSection}>
                  <FontAwesomeIcon icon={faPlus} />
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {isTaskModalOpen && activeProject && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-card light-modal">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Nouvelle tache</p>
                  <h3>Ajouter une tache</h3>
                </div>
                <span className="pill pill-electric">Etape {taskStep}/4</span>
              </div>

              {taskStep === 1 && (
                <div className="form-grid">
                  <label className="field">
                    <span>Titre</span>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Description</span>
                    <textarea
                      className="field-textarea"
                      value={newTask.description}
                      onChange={(event) => setNewTask((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>
                </div>
              )}

              {taskStep === 2 && (
                <div className="form-grid">
                  <label className="field">
                    <span>Type d action</span>
                    <select
                      value={newTask.interventionType}
                      onChange={(event) => setNewTask((current) => ({ ...current, interventionType: event.target.value }))}
                    >
                      <option value="">Choisir</option>
                      <option value="Intervention">Intervention</option>
                      <option value="Demande d'offre">Demande d'offre</option>
                      <option value="Decision">Decision</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Priorite</span>
                    <select
                      value={newTask.priority}
                      onChange={(event) => setNewTask((current) => ({ ...current, priority: event.target.value }))}
                    >
                      <option value="Pas urgent">Pas urgent</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Date</span>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(event) => setNewTask((current) => ({ ...current, dueDate: event.target.value }))}
                    />
                  </label>
                </div>
              )}

              {taskStep === 3 && (
                <div className="form-grid">
                  <label className="field">
                    <span>Section</span>
                    <select
                      value={newTask.section}
                      onChange={(event) => setNewTask((current) => ({ ...current, section: event.target.value }))}
                    >
                      <option value="">Choisir</option>
                      {activeProject.sections.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="assignee-grid">
                    {activeProject.participants
                      .filter((participant) => rolePermissions[getNormalizedRole(participant.role)]?.tabs?.includes('Taches'))
                      .map((participant) => (
                      <button
                        key={participant.id}
                        type="button"
                        className={`assignee-chip ${newTask.assignees.includes(participant.name) ? 'is-active' : ''}`}
                        onClick={() =>
                          setNewTask((current) => ({
                            ...current,
                            assignees: current.assignees.includes(participant.name)
                              ?current.assignees.filter((name) => name !== participant.name)
                              : [...current.assignees, participant.name],
                          }))
                        }
                      >
                        {participant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {taskStep === 4 && (
                <div className="summary-card">
                  <div className="summary-row">
                    <span>Titre</span>
                    <strong>{newTask.title || '-'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Type</span>
                    <strong>{newTask.interventionType || '-'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Section</span>
                    <strong>{newTask.section || '-'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Responsables</span>
                    <strong>{newTask.assignees.join(', ') || '-'}</strong>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => (taskStep === 1 ?setIsTaskModalOpen(false) : setTaskStep((step) => step - 1))}
                >
                  {taskStep === 1 ? 'Annuler' : 'Precedent'}
                </button>
                {taskStep < 4 ?(
                  <button type="button" className="action-button" onClick={() => setTaskStep((step) => step + 1)}>
                    Suivant
                  </button>
                ) : (
                  <button type="button" className="action-button" onClick={saveTask}>
                    <FontAwesomeIcon icon={faPlus} />
                    Valider
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function OverviewSection({ project, stats }) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isMobileOverview, setIsMobileOverview] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 767 : false));

  useEffect(() => {
    const syncViewport = () => setIsMobileOverview(window.innerWidth <= 767);
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  return (
    <>
      <section className="panel light-panel compact-panel">
        <div className="panel-heading compact dense-heading">
          <div>
            <p className="topbar-subcopy">{project.client} {'\u00b7'} {project.site} {'\u00b7'} {project.period}</p>
          </div>
          <div className="hero-inline-metrics">
            <span className="pill">{project.progress}%</span>
            <span className="pill">{project.budget}</span>
          </div>
        </div>
        <div className="overview-rail">
          <div className="overview-column">
            {isMobileOverview ? (
              <div className="stats-grid compact-stats-grid">
                {stats.map((stat, index) => (
                  <MetricBox
                    key={stat.label}
                    compact
                    label={stat.label}
                    value={stat.value}
                    detail={stat.detail}
                    icon={[faBuilding, faClipboardList, faFolderOpen, faComments][index]}
                  />
                ))}
              </div>
            ) : (
              <button type="button" className="action-button compact quickview-button" onClick={() => setIsQuickViewOpen(true)}>
                <FontAwesomeIcon icon={faLayerGroup} />
                Vue rapide
              </button>
            )}
          </div>
        </div>
      </section>
      {!isMobileOverview && isQuickViewOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal detail-modal">
            <div className="panel-heading compact">
              <div>
                <h3>Vue rapide</h3>
              </div>
              <button type="button" className="secondary-button compact" onClick={() => setIsQuickViewOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="stats-grid compact-stats-grid">
              {stats.map((stat, index) => (
                <MetricBox
                  key={stat.label}
                  compact
                  label={stat.label}
                  value={stat.value}
                  detail={stat.detail}
                  icon={[faBuilding, faClipboardList, faFolderOpen, faComments][index]}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <section className="stats-grid desktop-stats-grid">
        {stats.map((stat, index) => (
          <MetricBox
            key={stat.label}
            label={stat.label}
            value={stat.value}
            detail={stat.detail}
            icon={[faBuilding, faClipboardList, faFolderOpen, faComments][index]}
          />
        ))}
      </section>
    </>
  );
}

function ProjectsSection({
  activeProject,
  activeProjectId,
  activeProjectTab,
  availableTabs,
  canManageProject,
  currentParticipant,
  newSectionName,
  newTask,
  openSections,
  onBack,
  onEditProject,
  onOpenAccessModal,
  onOpenProjectInfo,
  onArchiveDocument,
  onArchivePlan,
  onArchiveProject,
  onArchiveTask,
  onCreateProject,
  onDeleteTask,
  onInvite,
  onMoveProject,
  onOpenProject,
  onOpenSectionModal,
  onOpenTaskModal,
  onSaveAdminDoc,
  onSaveDocument,
  onSavePlan,
  onUpdateTask,
  onSelectTab,
  onSetNewSectionName,
  onSetNewTask,
  onToggleSection,
  onToggleTaskCompleted,
  permissions,
  projects,
  taskLayout,
  setTaskStep,
  setTaskLayout,
  setTaskView,
  taskStep,
  taskView,
  workspacePermissions,
}) {
  const [isMobileProjectView, setIsMobileProjectView] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 767 : false));
  const [openedMobileProjectTab, setOpenedMobileProjectTab] = useState(null);
  const [showTaskRecap, setShowTaskRecap] = useState(false);

  useEffect(() => {
    const syncViewport = () => setIsMobileProjectView(window.innerWidth <= 767);
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    if (activeProjectTab !== 'Taches') {
      setShowTaskRecap(false);
    }
  }, [activeProjectId, activeProjectTab]);

  useEffect(() => {
    setOpenedMobileProjectTab(null);
  }, [activeProjectId, isMobileProjectView]);

  const selectedProjectTab = isMobileProjectView ? openedMobileProjectTab : activeProjectTab;
  const isMobileProjectTabOpen = isMobileProjectView && Boolean(openedMobileProjectTab);
  const visibleChantierTabs = chantierTabs.filter((tab) => availableTabs.includes(tab.id));
  if (!activeProject) {
    return (
      <section className="panel light-panel">
        <div className="panel-heading">
          <div>
            <h3>Selectionne un chantier</h3>
          </div>
          {workspacePermissions.createProject && (
            <button type="button" className="action-button" onClick={onCreateProject}>
              <FontAwesomeIcon icon={faPlus} />
              Ajouter un chantier
            </button>
          )}
        </div>
        <ProjectList
          activeProjectId={activeProjectId}
          canArchiveProject={workspacePermissions.archiveProject}
          onArchiveProject={onArchiveProject}
          onEditProject={onEditProject}
          projects={projects}
          onMoveProject={onMoveProject}
          onOpenProject={onOpenProject}
        />
      </section>
    );
  }
  const mobileProjectSubtitle = [activeProject.site, activeProject.client].filter(Boolean).join(' · ') || 'Coordination et suivi chantier';

  const openProjectTab = (tabId) => {
    onSelectTab(tabId);
    if (isMobileProjectView) {
      setOpenedMobileProjectTab(tabId);
    }
  };

  const closeMobileProjectTab = () => {
    setOpenedMobileProjectTab(null);
    setShowTaskRecap(false);
  };

  const renderProjectTabContent = (tabId) => {
    if (tabId === 'Administratif') {
      return (
        <AdminDocsTab
          canAddAdminDoc={permissions.addAdminDoc}
          canArchive={permissions.archiveDocument}
          onArchiveDoc={(documentId, archived) => onArchiveDocument?.(documentId, archived, 'adminDocs')}
          onSaveAdminDoc={onSaveAdminDoc}
          project={activeProject}
        />
      );
    }

    if (tabId === 'Documents') {
      return (
        <DocumentsTab
          canAddDocument={permissions.addDocument}
          canArchive={permissions.archiveDocument}
          onArchiveDocument={(documentId, archived) => onArchiveDocument?.(documentId, archived, 'documents')}
          onSaveDocument={onSaveDocument}
          project={activeProject}
        />
      );
    }

    if (tabId === 'Plan') {
      return (
        <PlansTab
          canAddPlan={permissions.addPlan}
          canArchive={permissions.archivePlan}
          onArchivePlan={onArchivePlan}
          onSavePlan={onSavePlan}
          project={activeProject}
        />
      );
    }

    if (tabId === 'Taches') {
      return (
        <CompactProjectTasksTab
          canArchiveTask={permissions.archiveTask}
          canCreateSection={permissions.createSection}
          canCreateTask={permissions.createTask}
          canDeleteTask={permissions.deleteTask}
          canUpdateTask={permissions.updateTask}
          onUpdateTask={onUpdateTask}
          project={activeProject}
          onDeleteTask={onDeleteTask}
          onOpenSectionModal={onOpenSectionModal}
          onOpenTaskModal={() => {
            setTaskStep(1);
            onSetNewTask({
              title: '',
              description: '',
              interventionType: '',
              dueDate: '',
              section: '',
              assignees: [],
              priority: 'Pas urgent',
            });
            onOpenTaskModal();
          }}
          onToggleTaskArchived={onArchiveTask}
          onSetTaskStatus={onToggleTaskCompleted}
          onToggleSection={onToggleSection}
          openSections={openSections}
          onCloseTaskRecap={() => setShowTaskRecap(false)}
          onToggleTaskRecap={() => setShowTaskRecap((current) => !current)}
          showTaskRecap={showTaskRecap}
          useTopbarTaskRecapControl={isMobileProjectView}
        />
      );
    }

    if (tabId === 'Acteurs') {
      return <CompactActorsTab project={activeProject} />;
    }

    return null;
  };

  if (!activeProject) {
    return (
      <section className="panel light-panel">
        <div className="panel-heading">
          <div>
            <h3>Selectionne un chantier</h3>
          </div>
          {workspacePermissions.createProject && (
            <button type="button" className="action-button" onClick={onCreateProject}>
              <FontAwesomeIcon icon={faPlus} />
              Ajouter un chantier
            </button>
          )}
        </div>
        <ProjectList
          activeProjectId={activeProjectId}
          canArchiveProject={workspacePermissions.archiveProject}
          onArchiveProject={onArchiveProject}
          onEditProject={onEditProject}
          projects={projects}
          onMoveProject={onMoveProject}
          onOpenProject={onOpenProject}
        />
      </section>
    );
  }

  return (
    <section className={`panel light-panel chantier-panel chantier-panel-full project-detail-screen ${isMobileProjectTabOpen ? 'is-mobile-tab-open' : ''}`}>
      {!isMobileProjectTabOpen ? (
      <div className="chantier-topbar">
        <div className="chantier-topbar-main">
          <button
            type="button"
            className="secondary-button compact chantier-back-button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onBack?.();
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span className="button-label">Retour</span>
          </button>
          <div className="chantier-topbar-title">
            <span className="eyebrow chantier-title-kicker">Chantier en cours</span>
            <h3>{activeProject.name}</h3>
            <p className="chantier-title-subline">{activeProject.site || activeProject.client || 'Suivi chantier'}</p>
          </div>
        </div>
        <div className="chantier-topbar-side">
          <div className="project-actions-row project-meta-row chantier-meta-side">
            <span className="project-meta-pill project-meta-pill-location">
              <FontAwesomeIcon icon={faLocationDot} />
              <strong>{activeProject.site}</strong>
            </span>
            <span className="project-meta-pill">
              <span>Client</span>
              <strong>{activeProject.client}</strong>
            </span>
            <span className="project-meta-pill">
              <span>Periode</span>
              <strong>{activeProject.period}</strong>
            </span>
            <span className="project-meta-pill">
              <span>Role</span>
              <strong>{getNormalizedRole(currentParticipant?.role) || '-'}</strong>
            </span>
          </div>
          <div className="chantier-topbar-actions">
            <div className="chantier-topbar-actions-right">
              <button type="button" className="secondary-button compact chantier-action-button chantier-info-button" onClick={onOpenProjectInfo} aria-label="Informations chantier">
                <FontAwesomeIcon icon={faCircleInfo} />
                <span className="button-label-desktop">Informations chantier</span>
                <span className="button-label-mobile">Infos chantier</span>
              </button>
              {activeProjectTab === 'Taches' && isMobileProjectView && (
                <button
                  type="button"
                  className={`secondary-button compact chantier-action-button chantier-recap-topbar-button ${showTaskRecap ? 'is-active' : ''}`}
                  onClick={() => setShowTaskRecap((current) => !current)}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span className="button-label-mobile">{showTaskRecap ? 'Fermer récap' : 'Récap +'}</span>
                </button>
              )}
              {canManageProject && (
                <button type="button" className="secondary-button compact chantier-action-button chantier-access-button" onClick={onOpenAccessModal}>
                  <span className="button-label-desktop">Gerer les acces</span>
                  <span className="button-label-mobile">Gérer accès</span>
                </button>
              )}
              {permissions.inviteParticipant && (
                <button type="button" className="secondary-button compact chantier-action-button" onClick={onInvite}>
                  <FontAwesomeIcon icon={faUserPlus} />
                  <span className="button-label-desktop">Inviter</span>
                  <span className="button-label-mobile">Inviter</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {!isMobileProjectTabOpen ? (
        isMobileProjectView ? (
      <div className="chantier-mobile-overview">
        <div className="chantier-mobile-tab-grid">
          {visibleChantierTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-button chantier-mobile-tab-card ${selectedProjectTab === tab.id ? 'is-active' : ''}`}
              onClick={() => openProjectTab(tab.id)}
            >
              <span className="chantier-mobile-tab-icon">
                <FontAwesomeIcon icon={tab.icon} />
              </span>
              <span className="chantier-mobile-tab-copy">
                <strong>{tab.mobileLabel || tab.label}</strong>
                <small>{tab.description}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
        ) : (
      <div className="tab-strip chantier-strip chantier-strip-top">
        {visibleChantierTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${selectedProjectTab === tab.id ? 'is-active' : ''}`}
            onClick={() => openProjectTab(tab.id)}
          >
            <FontAwesomeIcon icon={tab.icon} />
            <span className="tab-button-label tab-button-label-desktop">{tab.label}</span>
            <span className="tab-button-label tab-button-label-mobile">{tab.mobileLabel || tab.label}</span>
          </button>
        ))}
      </div>
        )
      ) : null}

      {isMobileProjectTabOpen ? (
        <div className="project-mobile-tab-screen">
          <div className="project-mobile-tab-header">
            <button type="button" className="secondary-button compact actors-back-button messages-back-button" onClick={closeMobileProjectTab}>
              <FontAwesomeIcon icon={faArrowLeft} />
              <span className="button-label">Retour</span>
            </button>
            {selectedProjectTab === 'Administratif' ? (
              <div className="admin-header-card project-mobile-admin-header">
                <div className="admin-header-copy">
                  <p className="eyebrow">Administratif</p>
                  <h3>Gestion administrative</h3>
                  <p className="admin-header-project-name">{activeProject.name}</p>
                  <p className="topbar-subcopy">{mobileProjectSubtitle}</p>
                </div>
              </div>
            ) : selectedProjectTab === 'Documents' ? (
              <div className="documents-header-card project-mobile-documents-header">
                <div className="documents-header-copy">
                  <p className="eyebrow">Documents</p>
                  <h3>Gestion documentaire</h3>
                  <p className="documents-header-project-name">{activeProject.name}</p>
                  <p className="topbar-subcopy">{mobileProjectSubtitle}</p>
                </div>
              </div>
            ) : selectedProjectTab === 'Plan' ? (
              <div className="plans-header-card project-mobile-plans-header">
                <div className="plans-header-copy">
                  <p className="eyebrow">Plan</p>
                  <h3>Gestion des plans</h3>
                  <p className="plans-header-project-name">{activeProject.name}</p>
                  <p className="topbar-subcopy">{mobileProjectSubtitle}</p>
                </div>
              </div>
            ) : selectedProjectTab === 'Taches' ? (
              <div className="tasks-header-card project-mobile-tasks-header">
                <div className="tasks-header-copy">
                  <p className="eyebrow">Taches</p>
                  <h3>Gestion des taches</h3>
                  <p className="tasks-header-project-name">{activeProject.name}</p>
                  <p className="topbar-subcopy">{mobileProjectSubtitle}</p>
                </div>
              </div>
            ) : (
              <div className="project-mobile-tab-title">
                <p className="eyebrow">Chantier</p>
                <h3>{selectedProjectTab}</h3>
                <p className="project-mobile-tab-subtitle">{activeProject.name}</p>
                <small>{mobileProjectSubtitle}</small>
              </div>
            )}
          </div>
          <div className="project-module-stage project-module-stage-mobile">
            {renderProjectTabContent(selectedProjectTab)}
          </div>
        </div>
      ) : (
        <div className="project-mobile-tab-hint">
          <strong>Choisis un sous-onglet</strong>
          <p>Chaque module s'ouvre maintenant sur son propre ecran mobile avec retour.</p>
        </div>
      )}

      {!isMobileProjectView ? <div className="project-module-stage">{renderProjectTabContent(selectedProjectTab)}</div> : null}
      </section>
  );
}

function ProjectList({ projects, onMoveProject, onOpenProject, onEditProject, activeProjectId, onArchiveProject, canArchiveProject }) {
  const [showArchived, setShowArchived] = useState(false);
  const visibleProjects = projects.filter((project) => (showArchived ?project.archived : !project.archived));

  return (
    <>
      <div className="documents-tabs-wrap project-archive-toggle-wrap">
        <div className="task-tabs">
          <button type="button" className={`tab-button ${showArchived ? '' : 'is-active'}`} onClick={() => setShowArchived(false)}>
            Actifs
          </button>
          <button type="button" className={`tab-button ${showArchived ? 'is-active' : ''}`} onClick={() => setShowArchived(true)}>
            Archive
          </button>
        </div>
      </div>
      <div className="project-list-frame">
      <div className="project-list project-list-rows view-mode-list">
        {visibleProjects.map((project, index) => (
          <article key={project.id} className={`project-list-card ${activeProjectId === project.id ? 'is-active' : ''}`}>
            <button type="button" className="project-list-main" onClick={() => onOpenProject(project.id)}>
              <div className="project-row-main">
                <div className="project-row-head">
                  <strong>{project.name}</strong>
                  <div className="project-row-head-right">
                    {project.archived ?<span className="pill">Archive</span> : null}
                    <span className="project-open-indicator">Ouvrir</span>
                  </div>
                </div>
                <div className="project-row-meta">
                  <span>{project.client}</span>
                  <span>{project.startDate} -> {project.endDate}</span>
                </div>
                <div className="project-row-meta project-row-meta-secondary">
                  <span>{project.site}</span>
                  <span>{project.participants.length} intervenants</span>
                </div>
              </div>
            </button>
            <div className="project-card-actions">
              <button
                type="button"
                className="secondary-button compact"
                onClick={() => onEditProject(project.id)}
              >
                Modifier
              </button>
              {canArchiveProject ?(
                <button
                  type="button"
                  className="secondary-button compact archive-button"
                  onClick={() => onArchiveProject?.(project.id, !project.archived)}
                >
                  {project.archived ? 'Restaurer' : 'Archiver'}
                </button>
              ) : null}
              <button
                type="button"
                className="reorder-button"
                aria-label="Monter"
                onClick={() => onMoveProject(project.id, 'up')}
                disabled={index === 0}
              >
                <FontAwesomeIcon icon={faArrowUp} />
              </button>
              <button
                type="button"
                className="reorder-button"
                aria-label="Descendre"
                onClick={() => onMoveProject(project.id, 'down')}
                disabled={index === projects.length - 1}
              >
                <FontAwesomeIcon icon={faArrowDown} />
              </button>
            </div>
          </article>
        ))}
      </div>
      </div>
    </>
  );
}


function AdminDocsTab({ project, canAddAdminDoc, canArchive, onArchiveDoc, onSaveAdminDoc }) {
  const [editingDoc, setEditingDoc] = useState(null);
  const [docStep, setDocStep] = useState(1);
  const [selectedType, setSelectedType] = useState('Offres');
  const [openAdminDocId, setOpenAdminDocId] = useState(null);
  const [openAdminGroups, setOpenAdminGroups] = useState({});
  const [showArchived, setShowArchived] = useState(false);

  const openAdminEditor = (doc) => {
    setEditingDoc({ ...doc });
    setDocStep(1);
  };

  const filteredDocs = project.adminDocs.filter((doc) => doc.type === selectedType && (showArchived ?doc.archived : !doc.archived));
  const groups = showArchived
    ? [
        {
          label: `${selectedType} archives`,
          items: filteredDocs,
        },
      ]
    : [
        {
          label: `${selectedType} en cours`,
          items: filteredDocs.filter((doc) => normalizeAdminDocStatus(doc.status) === 'En cours'),
        },
        {
          label: `${selectedType} envoyes`,
          items: filteredDocs.filter((doc) => normalizeAdminDocStatus(doc.status) === 'Envoye'),
        },
      ];
  const groupLabels = groups.map((group) => group.label).join('|');

  useEffect(() => {
    setOpenAdminGroups(
      Object.fromEntries(
        groupLabels
          .split('|')
          .filter(Boolean)
          .map((label) => [label, true])
      )
    );
    setOpenAdminDocId(null);
  }, [groupLabels]);

  return (
    <div className="admin-module">
      <div className="admin-header-card">
        <div className="admin-header-copy">
          <p className="eyebrow">Administratif</p>
          <h3>Gestion administrative</h3>
          <p className="admin-header-project-name">{project.name}</p>
          <p className="topbar-subcopy">Offres, factures, contrats, assurances et avancement du chantier au meme endroit.</p>
        </div>
      </div>

      <div className="task-tabs">
        {adminDocTypeOptions.map((type) => (
          <button
            key={type}
            type="button"
            className={`tab-button ${selectedType === type ? 'is-active' : ''}`}
            onClick={() => setSelectedType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="admin-doc-toolbar">
        <button type="button" className={`secondary-button compact admin-filter-button ${showArchived ? '' : 'is-active'}`} onClick={() => setShowArchived(false)}>
          En cours
        </button>
        <button type="button" className={`secondary-button compact admin-filter-button ${showArchived ? 'is-active' : ''}`} onClick={() => setShowArchived(true)}>
          Archives
        </button>
      </div>
      {groups.map((group) => (
        <div key={group.label} className="admin-group">
          <button
            type="button"
            className="section-header"
            onClick={() => setOpenAdminGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
          >
            <span>{group.label}</span>
            <span>{openAdminGroups[group.label] ? '-' : '+'}</span>
          </button>
          {openAdminGroups[group.label] ?(
          <>
          <div className="admin-group-header">
            <strong>{group.label}</strong>
            {canAddAdminDoc && (
              <button
                type="button"
                className="action-button compact"
                onClick={() => openAdminEditor({ ...initialAdminDocForm, type: selectedType })}
              >
                <FontAwesomeIcon icon={faPlus} />
                {adminDocCreateLabels[selectedType] || 'Ajouter'}
              </button>
            )}
          </div>
          <div className="admin-doc-list view-mode-list">
            {group.items.length ?(
              group.items.map((doc) => (
                <article key={doc.id} className={`admin-doc-item ${openAdminDocId === doc.id ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="admin-doc-summary"
                    onClick={() => setOpenAdminDocId((current) => (current === doc.id ? null : doc.id))}
                  >
                    <div className="admin-doc-main">
                      <strong>{doc.title}</strong>
                      <small>{project.client}</small>
                    </div>
                    <div className="admin-doc-meta">
                      <span>{doc.date}</span>
                      <span className="pill pill-electric">{doc.archived ? 'Archive' : normalizeAdminDocStatus(doc.status)}</span>
                    </div>
                  </button>
                  {openAdminDocId === doc.id ?(
                  <div className="admin-doc-details">
                    <div className="details-row">
                      <span>Type</span>
                      <strong>{doc.type}</strong>
                    </div>
                    <div className="details-row">
                      <span>Document</span>
                      <strong>{doc.fileName || '-'}</strong>
                    </div>
                    <div className="admin-doc-actions">
                      <button type="button" className="secondary-button compact" onClick={() => openAdminEditor(doc)}>
                        Modifier
                      </button>
                      {canArchive ?(
                        <button type="button" className="secondary-button compact archive-button" onClick={() => onArchiveDoc?.(doc.id, !doc.archived)}>
                          {doc.archived ? 'Restaurer' : 'Archiver'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="summary-card">
                <div className="summary-row">
                  <span>{'Aucun element dans ' + group.label.toLowerCase()}</span>
                  <strong>-</strong>
                </div>
              </div>
            )}
          </div>
          </>
          ) : null}
        </div>
      ))}
      {editingDoc && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal">
            <div className="panel-heading compact">
              <div>
                <h3>{editingDoc.id ? 'Modifier un document administratif' : 'Ajouter un document administratif'}</h3>
              </div>
              <span className="pill pill-electric">{'Etape ' + docStep + '/4'}</span>
            </div>
            {docStep === 1 && (
              <div className="form-grid">
                <label className="field">
                  <span>Type</span>
                  <select value={editingDoc.type} onChange={(event) => setEditingDoc((current) => ({ ...current, type: event.target.value }))}>
                    {adminDocTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Titre</span>
                  <input type="text" value={editingDoc.title} onChange={(event) => setEditingDoc((current) => ({ ...current, title: event.target.value }))} />
                </label>
              </div>
            )}
            {docStep === 2 && (
              <div className="form-grid">
                <label className="field">
                  <span>Date</span>
                  <input type="date" value={editingDoc.date} onChange={(event) => setEditingDoc((current) => ({ ...current, date: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Statut</span>
                  <select value={normalizeAdminDocStatus(editingDoc.status)} onChange={(event) => setEditingDoc((current) => ({ ...current, status: event.target.value }))}>
                    {adminDocStatusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {docStep === 3 && (
              <div className="form-grid">
                <label className="field field-full">
                  <span>Document</span>
                  <input
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setEditingDoc((current) => ({ ...current, fileName: file.name }));
                      }
                    }}
                  />
                </label>
                <div className="summary-card">
                  <div className="summary-row">
                    <span>Fichier selectionne</span>
                    <strong>{editingDoc.fileName || '-'}</strong>
                  </div>
                </div>
              </div>
            )}
            {docStep === 4 && (
              <div className="summary-card">
                <div className="summary-row">
                  <span>Type</span>
                  <strong>{editingDoc.type || '-'}</strong>
                </div>
                <div className="summary-row">
                  <span>Titre</span>
                  <strong>{editingDoc.title || '-'}</strong>
                </div>
                <div className="summary-row">
                  <span>Date</span>
                  <strong>{editingDoc.date || '-'}</strong>
                </div>
                <div className="summary-row">
                  <span>Statut</span>
                  <strong>{editingDoc.status || '-'}</strong>
                </div>
                <div className="summary-row">
                  <span>Document</span>
                  <strong>{editingDoc.fileName || '-'}</strong>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (docStep === 1) {
                    setEditingDoc(null);
                    setDocStep(1);
                    return;
                  }
                  setDocStep((step) => step - 1);
                }}
              >
                {docStep === 1 ? 'Annuler' : 'Precedent'}
              </button>
              {docStep < 4 ?(
                <button type="button" className="action-button" onClick={() => setDocStep((step) => step + 1)}>
                  Suivant
                </button>
              ) : (
                <button
                  type="button"
                  className="action-button"
                  onClick={() => {
                    onSaveAdminDoc(editingDoc);
                    setEditingDoc(null);
                    setDocStep(1);
                  }}
                >
                  Enregistrer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function DocumentsTab({ project, canAddDocument, canArchive, onArchiveDocument, onSaveDocument }) {
  const [editingDocument, setEditingDocument] = useState(null);
  const [documentStep, setDocumentStep] = useState(1);
  const [openDocumentId, setOpenDocumentId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const documentSections = [
    { id: 'Plans', label: 'Plans', tabLabel: 'Plans', aliases: ['Plans'] },
    { id: 'Technique', label: 'Technique', tabLabel: 'Technique', aliases: ['Technique', 'Techniques'] },
    { id: 'Photo', label: 'Photo', tabLabel: 'Photo', aliases: ['Photo', 'Photos'] },
  ];
  const [activeDocumentSection, setActiveDocumentSection] = useState('Plans');
  const categoriesMap = project.documents.reduce((map, doc) => {
    const key = doc.category;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(doc);
    return map;
  }, new Map());
  const visibleSections = documentSections.map((section) => ({
    ...section,
    docs: section.aliases.flatMap((alias) => categoriesMap.get(alias) ?? []).filter((doc) => (showArchived ?doc.archived : !doc.archived)),
  }));
  const selectedSection = visibleSections.find((section) => section.id === activeDocumentSection) ?? visibleSections[0];
  const isPhotoSection = selectedSection?.id === 'Photo';

  const openDocumentEditor = (doc) => {
    setEditingDocument({ ...doc });
    setDocumentStep(1);
  };

  useEffect(() => {
    const sectionDocs = selectedSection?.docs ?? [];
    setOpenDocumentId((current) => (sectionDocs.some((doc) => doc.id === current) ? current : null));
  }, [selectedSection]);

  return (
    <div className="documents-module">
      <div className="documents-header-card">
        <div className="documents-header-copy">
          <p className="eyebrow">Documents</p>
          <h3>Gestion documentaire</h3>
          <p className="documents-header-project-name">{project.name}</p>
          <p className="topbar-subcopy">Plans, documents techniques et photos du chantier regroupes dans une seule vue.</p>
        </div>
      </div>
      <div className="documents-shell">
        <div className="documents-tabs-wrap">
          <div className="task-tabs">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`tab-button ${activeDocumentSection === section.id ? 'is-active' : ''}`}
                onClick={() => setActiveDocumentSection(section.id)}
              >
                {section.tabLabel ?? section.label}
              </button>
            ))}
          </div>
          <div className="task-tabs">
            <button
              type="button"
              className={`secondary-button compact admin-filter-button ${showArchived ? '' : 'is-active'}`}
              onClick={() => setShowArchived(false)}
            >
              Actifs
            </button>
            <button
              type="button"
              className={`secondary-button compact admin-filter-button ${showArchived ? 'is-active' : ''}`}
              onClick={() => setShowArchived(true)}
            >
              Archives
            </button>
          </div>
          {canAddDocument ?(
            <button
              type="button"
              className="action-button compact documents-add-button"
              onClick={() => openDocumentEditor({
                ...initialDocumentForm,
                category: selectedSection?.aliases[0] ?? selectedSection?.label ?? '',
              })}
            >
              <FontAwesomeIcon icon={faPlus} />
              {`Ajouter ${selectedSection?.label ?? 'document'}`}
            </button>
          ) : null}
        </div>
        <div className={`documents-panel ${isPhotoSection ? 'is-photo-panel' : 'is-file-panel'}`}>
          {isPhotoSection ?(
            <div className="photo-gallery">
              {(selectedSection?.docs ?? []).map((doc) => (
                <article key={doc.id} className="photo-card">
                  <button
                    type="button"
                    className="photo-thumb"
                    onClick={() => setOpenDocumentId((current) => (current === doc.id ? null : doc.id))}
                    aria-label={'Ouvrir la photo ' + doc.name}
                  >
                    <span className="photo-thumb-badge">
                      <FontAwesomeIcon icon={faImage} />
                    </span>
                    <span className="photo-thumb-label">{doc.subcategory || 'Photo'}</span>
                    <span className="photo-thumb-toggle">{openDocumentId === doc.id ? '-' : '+'}</span>
                  </button>
                  <div className="photo-card-body">
                    <strong>{doc.name}</strong>
                    <div className="photo-card-meta">
                      <span>{doc.version}</span>
                      <span className="pill pill-electric">{doc.status}</span>
                    </div>
                    {openDocumentId === doc.id ?(
                      <div className="photo-card-details">
                        <div className="details-row">
                          <span>Categorie</span>
                          <strong>{doc.category}</strong>
                        </div>
                        <div className="details-row">
                          <span>Sous-categorie</span>
                          <strong>{doc.subcategory}</strong>
                        </div>
                        <div className="details-row">
                          <span>Document</span>
                          <strong>{doc.fileName || doc.name || '-'}</strong>
                        </div>
                        <div className="admin-doc-actions">
                          <button type="button" className="secondary-button compact" onClick={() => openDocumentEditor(doc)}>
                            Modifier
                          </button>
                          {canArchive ?(
                            <button type="button" className="secondary-button compact archive-button" onClick={() => onArchiveDocument?.(doc.id, !doc.archived)}>
                              {doc.archived ? 'Restaurer' : 'Archiver'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
              {(selectedSection?.docs ?? []).length === 0 ?(
                <article className="documents-empty-state">
                  <strong>Aucune photo pour le moment</strong>
                </article>
              ) : null}
            </div>
          ) : (
            <div className="document-list view-mode-list">
              {(selectedSection?.docs ?? []).map((doc) => (
                <article key={doc.id} className={`document-item ${openDocumentId === doc.id ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="document-summary"
                    onClick={() => setOpenDocumentId((current) => (current === doc.id ? null : doc.id))}
                  >
                    <div className="document-summary-main">
                      <strong>{doc.name}</strong>
                      {doc.subcategory && doc.subcategory !== doc.name ?<small>{doc.subcategory}</small> : null}
                    </div>
                    <div className="document-summary-meta">
                      <span>{doc.version}</span>
                      <span className="pill pill-electric">{doc.status}</span>
                      <span className="document-summary-toggle">{openDocumentId === doc.id ? '-' : '+'}</span>
                    </div>
                  </button>
                  {openDocumentId === doc.id ?(
                  <div className="document-details">
                    <div className="details-row">
                      <span>Categorie</span>
                      <strong>{doc.category}</strong>
                    </div>
                    <div className="details-row">
                      <span>Sous-categorie</span>
                      <strong>{doc.subcategory}</strong>
                    </div>
                    <div className="details-row">
                      <span>Document</span>
                      <strong>{doc.fileName || '-'}</strong>
                    </div>
                    <div className="admin-doc-actions">
                      <button type="button" className="secondary-button compact" onClick={() => openDocumentEditor(doc)}>
                        Modifier
                      </button>
                      {canArchive ?(
                        <button type="button" className="secondary-button compact archive-button" onClick={() => onArchiveDocument?.(doc.id, !doc.archived)}>
                          {doc.archived ? 'Restaurer' : 'Archiver'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  ) : null}
                </article>
              ))}
              {(selectedSection?.docs ?? []).length === 0 ?(
                <article className="documents-empty-state">
                  <strong>Aucun document pour le moment</strong>
                </article>
              ) : null}
            </div>
          )}
        </div>
      </div>
      {editingDocument && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal">
            <div className="panel-heading compact">
              <div>
                <h3>{editingDocument.id ? 'Modifier un document' : 'Ajouter un document'}</h3>
              </div>
              <span className="pill pill-electric">{'Etape ' + documentStep + '/4'}</span>
            </div>
            {documentStep === 1 && (
              <div className="form-grid">
                <label className="field">
                  <span>Categorie</span>
                  <input type="text" value={editingDocument.category} onChange={(event) => setEditingDocument((current) => ({ ...current, category: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Sous-categorie</span>
                  <input type="text" value={editingDocument.subcategory} onChange={(event) => setEditingDocument((current) => ({ ...current, subcategory: event.target.value }))} />
                </label>
                <label className="field field-full">
                  <span>Nom</span>
                  <input type="text" value={editingDocument.name} onChange={(event) => setEditingDocument((current) => ({ ...current, name: event.target.value }))} />
                </label>
              </div>
            )}
            {documentStep === 2 && (
              <div className="form-grid">
                <label className="field">
                  <span>Version</span>
                  <input type="text" value={editingDocument.version} onChange={(event) => setEditingDocument((current) => ({ ...current, version: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Statut</span>
                  <input type="text" value={editingDocument.status} onChange={(event) => setEditingDocument((current) => ({ ...current, status: event.target.value }))} />
                </label>
              </div>
            )}
            {documentStep === 3 && (
              <div className="form-grid">
                <label className="field field-full">
                  <span>Document</span>
                  <input
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setEditingDocument((current) => ({ ...current, fileName: file.name }));
                      }
                    }}
                  />
                </label>
                <div className="summary-card">
                  <div className="summary-row">
                    <span>Fichier selectionne</span>
                    <strong>{editingDocument.fileName || '-'}</strong>
                  </div>
                </div>
              </div>
            )}
            {documentStep === 4 && (
              <div className="summary-card">
                <div className="summary-row">
                  <span>Categorie</span>
                  <strong>{editingDocument.category || '-'}</strong>
                </div>
                <div className="summary-row">
                  <span>Sous-categorie</span>
                  <strong>{editingDocument.subcategory || '-'}</strong>
                </div>
                <div className="summary-row">
                  <span>Nom</span>
                  <strong>{editingDocument.name || '-'}</strong>
                </div>
                <div className="summary-row">
                  <span>Version</span>
                  <strong>{editingDocument.version || '-'}</strong>
                </div>
                <div className="summary-row">
                  <span>Statut</span>
                  <strong>{editingDocument.status || '-'}</strong>
                </div>
                <div className="summary-row">
                  <span>Document</span>
                  <strong>{editingDocument.fileName || '-'}</strong>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (documentStep === 1) {
                    setEditingDocument(null);
                    setDocumentStep(1);
                    return;
                  }
                  setDocumentStep((step) => step - 1);
                }}
              >
                {documentStep === 1 ? 'Annuler' : 'Precedent'}
              </button>
              {documentStep < 4 ?(
                <button type="button" className="action-button" onClick={() => setDocumentStep((step) => step + 1)}>
                  Suivant
                </button>
              ) : (
                <button
                  type="button"
                  className="action-button"
                  onClick={() => {
                    onSaveDocument(editingDocument);
                    setEditingDocument(null);
                    setDocumentStep(1);
                  }}
                >
                  Enregistrer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function useCanvasImage(imageUrl) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!imageUrl) {
      setImage(null);
      return undefined;
    }

    const nextImage = new window.Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.src = imageUrl;

    return () => {
      nextImage.onload = null;
    };
  }, [imageUrl]);

  return image;
}

function PlanAnnotationCanvas({
  imageUrl,
  annotations,
  selectedId,
  onAddAnnotation,
  onUpdateAnnotation,
  onSelectAnnotation,
}) {
  const image = useCanvasImage(imageUrl);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const isSyncingRef = useRef(false);
  const [stageSize, setStageSize] = useState({ width: 1120, height: 720 });

  useEffect(() => {
    const updateStageSize = () => {
      const nextWidth = containerRef.current?.clientWidth ?? 1120;
      const isMobileViewport = window.innerWidth <= 767;
      const minWidth = isMobileViewport ?280 : 640;
      const safeWidth = Math.max(minWidth, nextWidth - 2);
      const imageRatio = image && image.width && image.height ?image.width / image.height : 16 / 9;
      const maxHeight = isMobileViewport
        ?Math.max(260, window.innerHeight - 290)
        : Math.max(620, window.innerHeight - 140);
      let nextHeight = safeWidth / imageRatio;
      let fittedWidth = safeWidth;

      if (nextHeight > maxHeight) {
        nextHeight = maxHeight;
        fittedWidth = nextHeight * imageRatio;
      }

      if (isMobileViewport && fittedWidth > nextWidth - 2) {
        fittedWidth = Math.max(220, nextWidth - 2);
        nextHeight = fittedWidth / imageRatio;
      }

      setStageSize({
        width: Math.round(fittedWidth),
        height: Math.round(nextHeight),
      });
    };

    updateStageSize();

    if (window.ResizeObserver && containerRef.current) {
      const observer = new window.ResizeObserver(() => updateStageSize());
      observer.observe(containerRef.current);
      window.addEventListener('resize', updateStageSize);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', updateStageSize);
      };
    }

    window.addEventListener('resize', updateStageSize);
    return () => window.removeEventListener('resize', updateStageSize);
  }, [image]);

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) {
      return undefined;
    }

    const canvas = new FabricCanvas(canvasRef.current, {
      preserveObjectStacking: true,
      selection: true,
      allowTouchScrolling: false,
    });
    canvas.backgroundColor = '#edf3ff';
    canvas.selectionColor = 'rgba(37, 99, 235, 0.08)';
    canvas.selectionBorderColor = '#2563eb';
    canvas.selectionLineWidth = 1.5;
    if (canvas.upperCanvasEl) {
      canvas.upperCanvasEl.style.touchAction = 'none';
    }
    if (canvas.lowerCanvasEl) {
      canvas.lowerCanvasEl.style.touchAction = 'none';
    }
    if (canvas.wrapperEl) {
      canvas.wrapperEl.style.touchAction = 'none';
    }
    fabricRef.current = canvas;

    const emitSelection = () => {
      const activeObject = canvas.getActiveObject();
      onSelectAnnotation?.(activeObject?.annotationId ?? null);
    };

    const emitObjectUpdate = (target) => {
      if (!target?.annotationId || isSyncingRef.current) {
        return;
      }

      const patch = {
        x: Number(((target.left / stageSize.width) * 100).toFixed(2)),
        y: Number(((target.top / stageSize.height) * 100).toFixed(2)),
      };

      if (target.annotationType === 'rect') {
        patch.width = Math.round(target.getScaledWidth());
        patch.height = Math.round(target.getScaledHeight());
      }

      onUpdateAnnotation(target.annotationId, patch);
    };

    canvas.on('selection:created', emitSelection);
    canvas.on('selection:updated', emitSelection);
    canvas.on('selection:cleared', () => onSelectAnnotation?.(null));
    canvas.on('object:modified', (event) => emitObjectUpdate(event.target));
    canvas.on('mouse:down', (event) => {
      if (event.target || !imageUrl) {
        return;
      }

      const pointer = canvas.getPointer(event.e);
      onAddAnnotation({
        x: Number(((pointer.x / stageSize.width) * 100).toFixed(2)),
        y: Number(((pointer.y / stageSize.height) * 100).toFixed(2)),
      });
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [imageUrl, onAddAnnotation, onSelectAnnotation, onUpdateAnnotation, stageSize.height, stageSize.width]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) {
      return;
    }

    canvas.setDimensions({ width: stageSize.width, height: stageSize.height });
    canvas.renderAll();
  }, [stageSize]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) {
      return;
    }

    isSyncingRef.current = true;
    canvas.clear();
    canvas.backgroundColor = '#edf3ff';
    canvas.backgroundImage = undefined;

    if (image) {
      const background = new FabricImage(image, {
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
      });
      background.scaleToWidth(stageSize.width);
      background.scaleToHeight(stageSize.height);
      canvas.backgroundImage = background;
    }

    annotations.forEach((annotation) => {
      const left = (annotation.x / 100) * stageSize.width;
      const top = (annotation.y / 100) * stageSize.height;
      let object;

      if (annotation.type === 'rect') {
        object = new FabricRect({
          left,
          top,
          originX: 'center',
          originY: 'center',
          width: annotation.width ?? 140,
          height: annotation.height ?? 84,
          rx: 14,
          ry: 14,
          fill: 'rgba(37, 99, 235, 0.08)',
          stroke: annotation.color ?? '#2563eb',
          strokeWidth: 3,
        });
      } else if (annotation.type === 'circle') {
        object = new FabricCircle({
          left,
          top,
          originX: 'center',
          originY: 'center',
          radius: annotation.radius ?? 46,
          fill: 'rgba(220, 38, 38, 0.08)',
          stroke: annotation.color ?? '#dc2626',
          strokeWidth: 3,
        });
      } else if (annotation.type === 'text') {
        object = new Textbox(annotation.text || annotation.label || 'Note', {
          left,
          top,
          originX: 'center',
          originY: 'center',
          width: 180,
          fontSize: annotation.fontSize ?? 22,
          fontWeight: '700',
          fill: annotation.color ?? '#111827',
          backgroundColor: 'rgba(255,255,255,0.78)',
          splitByGrapheme: false,
        });
      } else {
        const badgeRect = new FabricRect({
          originX: 'center',
          originY: 'center',
          width: 72,
          height: 34,
          rx: 12,
          ry: 12,
          fill: annotation.color ?? '#2563eb',
          stroke: 'rgba(255,255,255,0.92)',
          strokeWidth: 2,
        });
        const badgeText = new Textbox(annotation.shortLabel ?? annotation.label ?? '', {
          originX: 'center',
          originY: 'center',
          width: 58,
          fontSize: 11,
          fontWeight: '700',
          fill: '#ffffff',
          textAlign: 'center',
          editable: false,
        });
        object = new FabricGroup([badgeRect, badgeText], {
          left,
          top,
          originX: 'center',
          originY: 'center',
        });
      }

      object.set({
        annotationId: annotation.id,
        annotationType: annotation.type,
        cornerStyle: 'circle',
        cornerColor: '#ffffff',
        cornerStrokeColor: '#2563eb',
        borderColor: '#2563eb',
        transparentCorners: false,
      });

      if (annotation.type !== 'rect') {
        object.set({
          lockScalingX: true,
          lockScalingY: true,
        });
      }

      canvas.add(object);

      if (selectedId === annotation.id) {
        canvas.setActiveObject(object);
      }
    });

    canvas.renderAll();
    isSyncingRef.current = false;
  }, [annotations, image, selectedId, stageSize.height, stageSize.width]);

  return (
    <div ref={containerRef} className="plan-konva-shell">
      <canvas ref={canvasRef} />
    </div>
  );
}


function PlansTab({ project, canAddPlan, canArchive, onArchivePlan, onSavePlan }) {
  const [openPlanId, setOpenPlanId] = useState(null);
  const [selectedPlanVersions, setSelectedPlanVersions] = useState({});
  const [studioPlan, setStudioPlan] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isMobileStudio, setIsMobileStudio] = useState(() => (typeof window !== 'undefined' ?window.innerWidth <= 767 : false));
  const [planTool, setPlanTool] = useState(planToolPresets[0].id);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [annotationHistory, setAnnotationHistory] = useState([]);
  const [annotationFuture, setAnnotationFuture] = useState([]);
  const activeToolPreset = planToolPresets.find((item) => item.id === planTool) ?? planToolPresets[0];

  const cloneAnnotations = (annotations) => (
    (annotations ?? []).map((annotation) => ({
      ...annotation,
      points: Array.isArray(annotation.points) ?[...annotation.points] : annotation.points,
    }))
  );

  const buildPlanSnapshot = (plan) => ({
    id: `version-${plan.id ?? 'new'}-${plan.version}-${Date.now()}`,
    version: plan.version,
    updatedAt: plan.updatedAt,
    fileName: plan.fileName,
    imageUrl: plan.imageUrl ?? '',
    annotations: cloneAnnotations(plan.annotations),
  });

  const getPlanVersions = (plan) => {
    const storedVersions = Array.isArray(plan.versions) ?plan.versions : [];
    const currentVersion = {
      id: `current-${plan.id}`,
      version: plan.version,
      updatedAt: plan.updatedAt,
      fileName: plan.fileName,
      imageUrl: plan.imageUrl ?? '',
      annotations: plan.annotations ?? [],
      isCurrent: true,
    };

    return [
      currentVersion,
      ...storedVersions.filter((version) => version.version !== plan.version),
    ];
  };

  const getDisplayedPlanVersion = (plan) => {
    const versions = getPlanVersions(plan);
    return versions.find((version) => version.id === selectedPlanVersions[plan.id]) ?? versions[0];
  };

  const getNextAnnotationLabel = (annotations) => {
    const numericLabels = annotations
      .map((annotation) => Number(annotation.label))
      .filter((value) => Number.isFinite(value));
    return String((numericLabels.length ?Math.max(...numericLabels) : 0) + 1);
  };

  const openPlanStudio = (plan) => {
    setStudioPlan({
      ...plan,
      updatedAt: plan.updatedAt || new Date().toISOString().slice(0, 10),
      imageUrl: plan.imageUrl ?? '',
      annotations: cloneAnnotations(plan.annotations),
      versions: Array.isArray(plan.versions) ?plan.versions.map((version) => ({ ...version })) : [],
    });
    setPlanTool(planToolPresets[0].id);
    setSelectedAnnotationId(null);
    setAnnotationHistory([]);
    setAnnotationFuture([]);
  };

  const closePlanStudio = () => {
    setStudioPlan(null);
    setSelectedAnnotationId(null);
    setAnnotationHistory([]);
    setAnnotationFuture([]);
  };

  const commitAnnotations = (updater) => {
    if (!studioPlan) {
      return;
    }

    const currentAnnotations = cloneAnnotations(studioPlan.annotations);
    const nextAnnotations = updater(currentAnnotations);
    setAnnotationHistory((current) => [currentAnnotations, ...current].slice(0, 40));
    setAnnotationFuture([]);
    setStudioPlan((current) => ({
      ...current,
      annotations: nextAnnotations,
      pins: nextAnnotations.length,
    }));
  };

  const createAnnotation = ({ x, y }) => {
    if (!studioPlan) {
      return;
    }

    const baseId = `annotation-${Date.now()}-${Math.round(x * 100)}`;
    const nextAnnotation = activeToolPreset.type === 'rect'
      ? {
          id: baseId,
          toolId: activeToolPreset.id,
          type: 'rect',
          x,
          y,
          width: 140,
          height: 84,
          color: activeToolPreset.color,
          label: activeToolPreset.label,
        }
      : activeToolPreset.type === 'circle'
        ? {
            id: baseId,
            toolId: activeToolPreset.id,
            type: 'circle',
            x,
            y,
            radius: 46,
            color: activeToolPreset.color,
            label: activeToolPreset.label,
          }
        : activeToolPreset.type === 'text'
          ? {
              id: baseId,
              toolId: activeToolPreset.id,
              type: 'text',
              x,
              y,
              text: activeToolPreset.text ?? activeToolPreset.label,
              fontSize: 22,
              color: activeToolPreset.color,
              label: activeToolPreset.label,
            }
          : {
              id: baseId,
              toolId: activeToolPreset.id,
              type: 'marker',
              x,
              y,
              label: getNextAnnotationLabel(studioPlan.annotations ?? []),
              shortLabel: activeToolPreset.short,
              color: activeToolPreset.color,
              family: activeToolPreset.label,
            };

    commitAnnotations((annotations) => [...annotations, nextAnnotation]);
    setSelectedAnnotationId(nextAnnotation.id);
  };

  const updatePlanAnnotation = (annotationId, patch) => {
    commitAnnotations((annotations) => annotations.map((annotation) => (
      annotation.id === annotationId ? { ...annotation, ...patch } : annotation
    )));
  };

  const removePlanAnnotation = (annotationId) => {
    commitAnnotations((annotations) => annotations.filter((annotation) => annotation.id !== annotationId));
    setSelectedAnnotationId((current) => (current === annotationId ? null : current));
  };

  const undoPlanChange = () => {
    if (!studioPlan || annotationHistory.length === 0) {
      return;
    }

    const [previousAnnotations, ...rest] = annotationHistory;
    setAnnotationHistory(rest);
    setAnnotationFuture((current) => [cloneAnnotations(studioPlan.annotations), ...current].slice(0, 40));
    setStudioPlan((current) => ({
      ...current,
      annotations: cloneAnnotations(previousAnnotations),
      pins: previousAnnotations.length,
    }));
    setSelectedAnnotationId(null);
  };

  const redoPlanChange = () => {
    if (!studioPlan || annotationFuture.length === 0) {
      return;
    }

    const [nextAnnotations, ...rest] = annotationFuture;
    setAnnotationFuture(rest);
    setAnnotationHistory((current) => [cloneAnnotations(studioPlan.annotations), ...current].slice(0, 40));
    setStudioPlan((current) => ({
      ...current,
      annotations: cloneAnnotations(nextAnnotations),
      pins: nextAnnotations.length,
    }));
    setSelectedAnnotationId(null);
  };

  const savePlanDraft = () => {
    if (!studioPlan) {
      return;
    }

    const snapshotPlan = {
      ...studioPlan,
      updatedAt: studioPlan.updatedAt || new Date().toISOString().slice(0, 10),
      annotations: studioPlan.annotations ?? [],
    };
    const existingPlan = project.plans.find((plan) => plan.id === snapshotPlan.id);
    const nextSnapshot = buildPlanSnapshot(snapshotPlan);
    const previousVersions = Array.isArray(existingPlan?.versions)
      ?existingPlan.versions.filter((version) => version.version !== snapshotPlan.version)
      : [];

    onSavePlan({
      ...snapshotPlan,
      pins: snapshotPlan.annotations.length,
      versions: [nextSnapshot, ...previousVersions],
    });
    closePlanStudio();
  };

  const selectedAnnotation = useMemo(
    () => studioPlan?.annotations?.find((annotation) => annotation.id === selectedAnnotationId) ?? null,
    [studioPlan, selectedAnnotationId]
  );
  const visiblePlans = project.plans.filter((plan) => (showArchived ?plan.archived : !plan.archived));

  useEffect(() => {
    setOpenPlanId((current) => (project.plans.some((plan) => plan.id === current) ? current : null));
  }, [project.plans]);

  useEffect(() => {
    if (!studioPlan?.annotations?.some((annotation) => annotation.id === selectedAnnotationId)) {
      setSelectedAnnotationId(null);
    }
  }, [studioPlan, selectedAnnotationId]);

  useEffect(() => {
    const syncViewport = () => setIsMobileStudio(window.innerWidth <= 767);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const renderAnnotationInspector = (annotation) => {
    if (!annotation) {
      return null;
    }

    return (
      <div className="summary-card">
        <div className="summary-row">
          <span>Repere</span>
          <strong>{annotation.family || annotation.label || annotation.type}</strong>
        </div>

        {annotation.type === 'marker' ?(
          <label className="field">
            <span>Numero</span>
            <input
              type="text"
              value={annotation.label ?? ''}
              onChange={(event) => updatePlanAnnotation(annotation.id, { label: event.target.value })}
            />
          </label>
        ) : null}

        {annotation.type === 'text' ?(
          <label className="field">
            <span>Texte</span>
            <input
              type="text"
              value={annotation.text ?? ''}
              onChange={(event) => updatePlanAnnotation(annotation.id, { text: event.target.value })}
            />
          </label>
        ) : null}

        {annotation.type === 'circle' ?(
          <label className="field">
            <span>Rayon</span>
            <input
              type="number"
              value={annotation.radius ?? 46}
              onChange={(event) => updatePlanAnnotation(annotation.id, { radius: Number(event.target.value || 0) })}
            />
          </label>
        ) : null}

        {annotation.type === 'rect' ?(
          <div className="form-grid">
            <label className="field">
              <span>Largeur</span>
              <input
                type="number"
                value={annotation.width ?? 140}
                onChange={(event) => updatePlanAnnotation(annotation.id, { width: Number(event.target.value || 0) })}
              />
            </label>
            <label className="field">
              <span>Hauteur</span>
              <input
                type="number"
                value={annotation.height ?? 84}
                onChange={(event) => updatePlanAnnotation(annotation.id, { height: Number(event.target.value || 0) })}
              />
            </label>
          </div>
        ) : null}

        <div className="admin-doc-actions">
          <button type="button" className="secondary-button compact" onClick={() => removePlanAnnotation(annotation.id)}>
            Supprimer
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="plans-module">
      <div className="plans-header-card">
        <div className="plans-header-copy">
          <p className="eyebrow">Plan</p>
          <h3>Gestion des plans</h3>
          <p className="plans-header-project-name">{project.name}</p>
          <p className="topbar-subcopy">Plans, versions et annotations du chantier dans une seule interface.</p>
        </div>
      </div>
      <div className="plan-toolbar">
        <button type="button" className={`secondary-button compact admin-filter-button ${showArchived ? '' : 'is-active'}`} onClick={() => setShowArchived(false)}>
          Actifs
        </button>
        <button type="button" className={`secondary-button compact admin-filter-button ${showArchived ? 'is-active' : ''}`} onClick={() => setShowArchived(true)}>
          Archives
        </button>
        {canAddPlan ?(
          <button
            type="button"
            className="action-button compact plan-add-button"
            onClick={() => openPlanStudio({ ...initialPlanForm, updatedAt: new Date().toISOString().slice(0, 10) })}
          >
            <FontAwesomeIcon icon={faPlus} />
            Ajouter un plan
          </button>
        ) : null}
      </div>

      <div className="plan-list view-mode-list">
        {visiblePlans.length === 0 ?(
          <div className="documents-empty-state">
            <strong>Aucun plan</strong>
            <span>Ajoute un plan pour commencer l'annotation.</span>
          </div>
        ) : null}

        {visiblePlans.map((plan) => {
          const displayedVersion = getDisplayedPlanVersion(plan);

          return (
            <article key={plan.id} className={`plan-item ${openPlanId === plan.id ? 'is-open' : ''}`}>
              <button
                type="button"
                className="plan-summary"
                onClick={() => setOpenPlanId((current) => (current === plan.id ? null : plan.id))}
              >
                <div className="plan-summary-main">
                  <strong>{plan.name}</strong>
                  <small>{`Mis a jour le ${plan.updatedAt}`}</small>
                </div>
                <div className="plan-summary-meta">
                  <span className="pill pill-electric">{`v${plan.version}`}</span>
                  <span>{`${plan.pins ?? 0} reperes`}</span>
                  <span className="plan-summary-toggle">{openPlanId === plan.id ? '-' : '+'}</span>
                </div>
              </button>

              {openPlanId === plan.id ?(
                <div className="plan-details plan-details-clean">
                  <div className="plan-version-strip">
                    {getPlanVersions(plan).map((version) => (
                      <button
                        key={version.id}
                        type="button"
                        className={`tab-button small ${((selectedPlanVersions[plan.id] ?? `current-${plan.id}`) === version.id) ? 'is-active' : ''}`}
                        onClick={() => setSelectedPlanVersions((current) => ({ ...current, [plan.id]: version.id }))}
                      >
                        {`v${version.version}`}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={`plan-preview-card ${displayedVersion?.imageUrl ? 'has-image' : ''}`}
                    style={displayedVersion?.imageUrl ? { '--plan-image': `url(${displayedVersion.imageUrl})` } : undefined}
                    onClick={() => openPlanStudio(plan)}
                  >
                    <div className="plan-preview-copy">
                      <strong>Ouvrir le plan</strong>
                      <span>Edition plein ecran</span>
                    </div>
                  </button>

                  <div className="plan-details-grid">
                    <div className="details-row">
                      <span>Version affichee</span>
                      <strong>{`v${displayedVersion?.version ?? plan.version}`}</strong>
                    </div>
                    <div className="details-row">
                      <span>Reperes</span>
                      <strong>{displayedVersion?.annotations?.length ?? 0}</strong>
                    </div>
                    <div className="details-row">
                      <span>Document</span>
                      <strong>{displayedVersion?.fileName || '-'}</strong>
                    </div>
                  </div>

                  <div className="admin-doc-actions">
                    <button type="button" className="secondary-button compact" onClick={() => openPlanStudio(plan)}>
                      Modifier le plan
                    </button>
                    {canArchive ?(
                      <button type="button" className="secondary-button compact archive-button" onClick={() => onArchivePlan?.(plan.id, !plan.archived)}>
                        {plan.archived ? 'Restaurer' : 'Archiver'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {studioPlan ?(
        <div className="modal-backdrop plan-studio-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal plan-studio-modal">
            {isMobileStudio ?(
              <div className="plan-studio-mobile">
                <div className="plan-mobile-topbar">
                  <button type="button" className="secondary-button compact" onClick={closePlanStudio}>
                    Fermer
                  </button>
                  <div className="plan-mobile-topbar-copy">
                    <strong>{studioPlan.name || 'Plan'}</strong>
                    <span>{`v${studioPlan.version} - ${studioPlan.annotations?.length ?? 0} reperes`}</span>
                  </div>
                  <div className="plan-mobile-topbar-actions">
                    <button type="button" className="action-button compact" onClick={savePlanDraft}>
                      Enregistrer
                    </button>
                  </div>
                </div>

                <div className="plan-mobile-stage">
                  <div className="plan-mobile-stage-meta">
                    <span className="plan-studio-chip">{activeToolPreset.label}</span>
                    <span className="plan-studio-chip">{studioPlan.fileName || 'Aucune image'}</span>
                  </div>
                  <PlanAnnotationCanvas
                    imageUrl={studioPlan.imageUrl}
                    annotations={studioPlan.annotations ?? []}
                    selectedId={selectedAnnotationId}
                    onAddAnnotation={createAnnotation}
                    onUpdateAnnotation={updatePlanAnnotation}
                    onSelectAnnotation={setSelectedAnnotationId}
                  />
                </div>

                <div className="plan-mobile-dock">
                  <div className="plan-mobile-dock-bar">
                    <label className="plan-mobile-tool-select">
                      <span>Outil</span>
                      <select value={planTool} onChange={(event) => setPlanTool(event.target.value)}>
                        {planToolPresets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="plan-mobile-actions">
                    <label className="secondary-button compact plan-upload-button">
                      Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }

                          setStudioPlan((current) => ({
                            ...current,
                            fileName: file.name,
                            imageUrl: URL.createObjectURL(file),
                          }));
                        }}
                      />
                    </label>
                    <button type="button" className="secondary-button compact" onClick={undoPlanChange} disabled={annotationHistory.length === 0}>
                      Annuler
                    </button>
                    <button type="button" className="secondary-button compact" onClick={redoPlanChange} disabled={annotationFuture.length === 0}>
                      Refaire
                    </button>
                    <button
                      type="button"
                      className="secondary-button compact"
                      onClick={() => {
                        commitAnnotations(() => []);
                        setSelectedAnnotationId(null);
                      }}
                    >
                      Effacer
                    </button>
                  </div>

                  {selectedAnnotation ?(
                    <div className="plan-mobile-sheet">
                      <div className="plan-mobile-sheet-head">
                        <strong>Repere selectionne</strong>
                      </div>
                      {renderAnnotationInspector(selectedAnnotation)}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <div className="plan-studio-head">
                  <div className="plan-studio-head-main">
                    <label className="field">
                      <span>Nom du plan</span>
                      <input
                        type="text"
                        value={studioPlan.name}
                        onChange={(event) => setStudioPlan((current) => ({ ...current, name: event.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span>Version</span>
                      <input
                        type="number"
                        value={studioPlan.version}
                        onChange={(event) => setStudioPlan((current) => ({ ...current, version: Number(event.target.value || 0) }))}
                      />
                    </label>
                    <label className="field">
                      <span>Mis a jour le</span>
                      <input
                        type="date"
                        value={studioPlan.updatedAt}
                        onChange={(event) => setStudioPlan((current) => ({ ...current, updatedAt: event.target.value }))}
                      />
                    </label>
                  </div>

                  <div className="plan-studio-head-actions">
                    <label className="secondary-button compact plan-upload-button">
                      Changer l'image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }

                          setStudioPlan((current) => ({
                            ...current,
                            fileName: file.name,
                            imageUrl: URL.createObjectURL(file),
                          }));
                        }}
                      />
                    </label>
                    <button type="button" className="secondary-button compact" onClick={closePlanStudio}>
                      Fermer
                    </button>
                    <button type="button" className="action-button" onClick={savePlanDraft}>
                      Enregistrer
                    </button>
                  </div>
                </div>

                <div className="plan-studio-toolbar">
                  <div className="plan-studio-tools">
                    {planToolPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset.id}
                        className={`plan-tool-chip ${planTool === preset.id ? 'is-active' : ''}`}
                        onClick={() => setPlanTool(preset.id)}
                      >
                        <span>{preset.short}</span>
                        <small>{preset.label}</small>
                      </button>
                    ))}
                  </div>

                  <div className="plan-studio-toolbar-actions">
                    <button type="button" className="secondary-button compact" onClick={undoPlanChange} disabled={annotationHistory.length === 0}>
                      Annuler
                    </button>
                    <button type="button" className="secondary-button compact" onClick={redoPlanChange} disabled={annotationFuture.length === 0}>
                      Refaire
                    </button>
                    <button
                      type="button"
                      className="secondary-button compact"
                      onClick={() => {
                        commitAnnotations(() => []);
                        setSelectedAnnotationId(null);
                      }}
                    >
                      Effacer tout
                    </button>
                  </div>
                </div>

                <div className={`plan-studio-workspace ${selectedAnnotation ? 'has-sidebar' : ''}`}>
                  <div className="plan-studio-stage">
                    <div className="plan-studio-stage-meta">
                      <span className="plan-studio-chip">{activeToolPreset.label}</span>
                      <span className="plan-studio-chip">{`${studioPlan.annotations?.length ?? 0} reperes`}</span>
                      <span className="plan-studio-chip">{studioPlan.fileName || 'Aucune image'}</span>
                    </div>
                    <PlanAnnotationCanvas
                      imageUrl={studioPlan.imageUrl}
                      annotations={studioPlan.annotations ?? []}
                      selectedId={selectedAnnotationId}
                      onAddAnnotation={createAnnotation}
                      onUpdateAnnotation={updatePlanAnnotation}
                      onSelectAnnotation={setSelectedAnnotationId}
                    />
                  </div>

                  {selectedAnnotation ?(
                    <aside className="plan-studio-sidebar">
                      {renderAnnotationInspector(selectedAnnotation)}
                    </aside>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function ProjectTasksTab({
  project,
  taskView,
  onDeleteTask,
  onOpenSectionModal,
  onOpenTaskModal,
  onSetTaskView,
  onSetTaskStatus,
  onToggleSection,
  openSections,
}) {
  const filteredTasks = project.tasks.filter((task) => getTaskStatus(task) === taskView);
  const canCreateTask = typeof onOpenTaskModal === 'function';
  const canCreateSection = typeof onOpenSectionModal === 'function';
  return (
    <div className="task-module">
      <div className="task-toolbar">
        <div className="task-toolbar-actions">
          {canCreateTask && (
            <button type="button" className="action-button" onClick={onOpenTaskModal}>
              <FontAwesomeIcon icon={faPlus} />
              Ajouter une tache
            </button>
          )}
          {canCreateSection && (
            <button type="button" className="secondary-button" onClick={onOpenSectionModal}>
              <FontAwesomeIcon icon={faPlus} />
              Ajouter une section
            </button>
          )}
        </div>
      </div>

      {project.sections.map((section) => (
        <div key={section} className="section-block">
          <button type="button" className="section-header" onClick={() => onToggleSection(section)}>
            <span>{section}</span>
            <span>{openSections[section] ? '-' : '+'}</span>
          </button>
          {openSections[section] && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Titre</th>
                    <th>Responsable</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks
                    .filter((task) => task.section === section)
                    .map((task, index) => (
                      <tr key={task.id}>
                        <td>{index + 1}</td>
                        <td>{task.title}</td>
                        <td>{task.assignees?.join(', ') || 'Non assigne'}</td>
                        <td>{task.interventionType || '-'}</td>
                        <td>{task.dueDate || '-'}</td>
                        <td>{getTaskStatus(task)}</td>
                        <td className="task-actions-cell">
                          {getTaskStatus(task) !== 'A faire' && (
                            <button
                              type="button"
                              className="secondary-button compact"
                              onClick={() => onSetTaskStatus(task.id, 'A faire')}
                            >
                              A faire
                            </button>
                          )}
                          {getTaskStatus(task) !== 'En cours' && (
                            <button
                              type="button"
                              className="secondary-button compact"
                              onClick={() => onSetTaskStatus(task.id, 'En cours')}
                            >
                              En cours
                            </button>
                          )}
                          {getTaskStatus(task) !== 'Terminee' && (
                            <button
                              type="button"
                              className="secondary-button compact"
                              onClick={() => onSetTaskStatus(task.id, 'Terminee')}
                            >
                              Terminer
                            </button>
                          )}
                          <button type="button" className="icon-button danger" onClick={() => onDeleteTask(task.id)}>
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function ActorsTab({ project }) {
  const actorConversations = useMemo(() => {
    const generalConversation = {
      id: 'general-site',
      name: 'Discussion generale',
      participantsLabel: `${project.participants.length} intervenants`,
      preview: 'Canal commun pour tout le chantier.',
      messages: [
        { id: 'general-1', author: 'Coordination', text: 'Bonjour a tous, point chantier a 8h30 demain.', time: '08:12', own: false },
        { id: 'general-2', author: 'Vous', text: 'Bien recu, je serai present.', time: '08:18', own: true, status: 'Lu' },
        { id: 'general-3', author: 'Architecte', text: 'Je partage aussi les derniers ajustements avant la reunion.', time: '08:24', own: false },
      ],
    };

    const privateConversations = project.participants.filter((participant) => participant.name !== demoWorkspace.user.name).map((participant, index) => ({
      id: `actor-${participant.id}`,
      name: participant.name,
      participantsLabel: `Prive  -  ${getNormalizedRole(participant.role)}`,
      preview: `Discussion privee avec ${participant.name}`,
      messages: [
        { id: `${participant.id}-1`, author: participant.name, text: `Bonjour, je vous envoie le point du jour pour ${participant.name}.`, time: `0${(index % 3) + 8}:14`, own: false },
        { id: `${participant.id}-2`, author: 'Vous', text: 'Parfait, je regarde cela et je reviens vers vous rapidement.', time: `0${(index % 3) + 8}:21`, own: true, status: 'Lu' },
        { id: `${participant.id}-3`, author: participant.name, text: 'Merci, je reste disponible si besoin.', time: `0${(index % 3) + 8}:27`, own: false },
      ],
    }));

    return [generalConversation, ...privateConversations];
  }, [project.participants]);

  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messageDraft, setMessageDraft] = useState('');
  const initialMessagesByConversation = useMemo(
    () => Object.fromEntries(actorConversations.map((conversation) => [conversation.id, conversation.messages])),
    [actorConversations]
  );
  const [messagesByConversation, setMessagesByConversation] = useState(initialMessagesByConversation);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    setMessagesByConversation(initialMessagesByConversation);
    setMessageDraft('');
  }, [initialMessagesByConversation]);

  const conversationRows = actorConversations.map((conversation) => {
    const thread = messagesByConversation[conversation.id] ?? conversation.messages;
    const lastMessage = thread[thread.length - 1];
    const preview = lastMessage?.attachment
      ?`${lastMessage.attachment.kind === 'image' ? 'Photo' : 'Piece jointe'} : ${lastMessage.attachment.name}`
      : (lastMessage?.text ?? conversation.preview);

    return {
      ...conversation,
      preview,
      lastTime: lastMessage?.time ?? '08:42',
    };
  });

  const selectedConversation = actorConversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const thread = selectedConversation ? (messagesByConversation[selectedConversation.id] ?? []) : [];

  const sendMessage = async () => {
    const content = messageDraft.trim();
    if (!content || !selectedConversation) {
      return;
    }

    const time = new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
    setMessagesByConversation((current) => ({
      ...current,
      [selectedConversation.id]: [
        ...(current[selectedConversation.id] ?? []),
        {
          id: `${selectedConversation.id}-${Date.now()}`,
          author: 'Vous',
          text: content,
          time,
          own: true,
          status: 'Envoye',
          attachment: null,
        },
      ],
    }));
    setMessageDraft('');
  };

  const addAttachmentToConversation = async (file, kind) => {
    if (!file || !selectedConversation) {
      return;
    }

    const time = new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
    const attachment = {
      name: file.name,
      mimeType: file.type,
      sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} Ko`,
      url: URL.createObjectURL(file),
      kind,
    };

    setMessagesByConversation((current) => ({
      ...current,
      [selectedConversation.id]: [
        ...(current[selectedConversation.id] ?? []),
        {
          id: `${selectedConversation.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          author: 'Vous',
          text: kind === 'image' ?`Photo envoyee : ${attachment.name}` : `Piece jointe : ${attachment.name}`,
          time,
          own: true,
          status: 'Envoye',
          attachment,
        },
      ],
    }));
  };

  const handleGallerySelection = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      addAttachmentToConversation(file, file.type.startsWith('image/') ? 'image' : 'file');
    }
    event.target.value = '';
  };

  const handleCameraSelection = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      addAttachmentToConversation(file, 'image');
    }
    event.target.value = '';
  };

  return (
    <div className={`messages-app ${selectedConversation ? 'has-open-thread' : ''}`}>
      {!selectedConversation ?(
      <div className="actors-list messages-list-panel">
        <div className="messages-list-top">
          <div>
            <strong>Discussions chantier</strong>
            <small>{project.name}</small>
          </div>
          <span className="pill">{conversationRows.length}</span>
        </div>
        <div className="messages-conversation-list">
          {conversationRows.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className="message-list-card"
              onClick={() => setSelectedConversationId(conversation.id)}
            >
              <span className="message-list-avatar">{conversation.name.slice(0, 2).toUpperCase()}</span>
              <span className="message-list-main">
                <span className="message-list-head">
                  <strong>{conversation.name}</strong>
                  <small>{conversation.lastTime}</small>
                </span>
                <small className="message-list-preview">{conversation.preview}</small>
              </span>
              <span className="message-list-meta">
                <span className="pill pill-electric">{conversation.id === 'general-site' ? 'groupe' : 'prive'}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      ) : (
      <div className="actors-chat messages-thread is-visible">
        <div className="actors-chat-header messages-thread-header">
          <div className="conversation-header-main">
            <button
              type="button"
              className="actors-back-button messages-back-button"
              onClick={() => setSelectedConversationId(null)}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <span className="conversation-avatar large">{selectedConversation?.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{selectedConversation?.name}</strong>
              <small>{selectedConversation?.participantsLabel}</small>
            </div>
          </div>
        </div>
        <div className="actors-messages actors-thread-body">
          {thread.map((item) => (
            <div key={item.id} className={`chat-row ${item.own ? 'is-own' : ''}`}>
              <article className={`chat-bubble ${item.own ? 'is-own' : ''}`}>
                {!item.own ?<strong>{item.author}</strong> : null}
                {item.attachment?.kind === 'image' ?(
                  <a href={item.attachment.url} target="_blank" rel="noreferrer" className="chat-attachment-preview">
                    <img src={item.attachment.url} alt={item.attachment.name} className="chat-image-preview" />
                  </a>
                ) : null}
                <p>{item.text}</p>
                {item.attachment?.kind === 'file' ?(
                  <a href={item.attachment.url} target="_blank" rel="noreferrer" className="chat-attachment-link">
                    <FontAwesomeIcon icon={faFile} />
                    <span>{item.attachment.name}</span>
                  </a>
                ) : null}
                <small>{item.time}{item.own && item.status ?`  -  ${item.status}` : ''}</small>
              </article>
            </div>
          ))}
        </div>
        <div className="messages-composer">
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="messages-hidden-input"
            onChange={handleGallerySelection}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="messages-hidden-input"
            onChange={handleCameraSelection}
          />
          <button type="button" className="icon-button" onClick={() => galleryInputRef.current?.click()} aria-label="Ajouter une piece jointe">
            <FontAwesomeIcon icon={faPaperclip} />
          </button>
          <button type="button" className="icon-button" onClick={() => cameraInputRef.current?.click()} aria-label="Prendre une photo">
            <FontAwesomeIcon icon={faCamera} />
          </button>
          <input
            type="text"
            value={messageDraft}
            onChange={(event) => setMessageDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ecrire un message"
          />
          <button type="button" className="action-button messages-send-button" onClick={sendMessage} aria-label="Envoyer">
            <FontAwesomeIcon icon={faPaperPlane} />
            <span className="messages-send-label">Envoyer</span>
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
function CompactProjectTasksTab({
  canArchiveTask,
  canCreateSection,
  canCreateTask,
  canDeleteTask,
  canUpdateTask,
  onUpdateTask,
  showTaskRecapControl = true,
  project,
  onDeleteTask,
  onCloseTaskRecap,
  onOpenSectionModal,
  onOpenTaskModal,
  onSetTaskStatus,
  onToggleTaskRecap,
  onToggleTaskArchived,
  onToggleSection,
  openSections,
  showTaskRecap,
  useTopbarTaskRecapControl = false,
}) {
  const [openTaskId, setOpenTaskId] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [isMobileTaskBoard, setIsMobileTaskBoard] = useState(() => (typeof window !== 'undefined' ?window.innerWidth <= 480 : false));
  const [showArchived, setShowArchived] = useState(false);
  const [selectedSection, setSelectedSection] = useState(project.sections?.[0] ?? null);
  const [internalShowTaskRecap, setInternalShowTaskRecap] = useState(false);
  const [collapsedStatuses, setCollapsedStatuses] = useState({});

  useEffect(() => {
    const syncViewport = () => setIsMobileTaskBoard(window.innerWidth <= 480);
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    if (!project.sections?.length) {
      setSelectedSection(null);
      return;
    }

    setSelectedSection((current) => (current && project.sections.includes(current) ?current : project.sections[0]));
  }, [project.sections]);

  const scopedTasks = project.tasks.filter((task) => task.archived === showArchived);
  const sectionTasks = scopedTasks.filter((task) => task.section === selectedSection);
  const openedMobileTask = isMobileTaskBoard ?sectionTasks.find((task) => task.id === openTaskId) ?? null : null;
  const projectTasks = project.tasks ?? [];
  const isTaskRecapOpen = typeof showTaskRecap === 'boolean' ? showTaskRecap : internalShowTaskRecap;
  const toggleTaskRecap = () => {
    if (typeof onToggleTaskRecap === 'function') {
      onToggleTaskRecap();
      return;
    }

    setInternalShowTaskRecap((current) => !current);
  };
  const closeTaskRecap = () => {
    if (typeof onCloseTaskRecap === 'function') {
      onCloseTaskRecap();
      return;
    }

    setInternalShowTaskRecap(false);
  };
  const recapItems = [
    { label: 'Total', value: projectTasks.length },
    { label: 'A faire', value: projectTasks.filter((task) => getTaskStatus(task) === 'A faire').length },
    { label: 'En cours', value: projectTasks.filter((task) => getTaskStatus(task) === 'En cours').length },
    { label: 'Terminees', value: projectTasks.filter((task) => getTaskStatus(task) === 'Terminee').length },
    { label: 'Urgentes', value: projectTasks.filter((task) => getTaskPriorityLabel(task.priority) === 'Urgent').length },
    { label: 'Sections', value: project.sections?.length ?? 0 },
  ];
  const recapSections = (project.sections ?? []).map((section) => ({
    section,
    tasks: projectTasks.filter((task) => task.section === section),
  }));
  const toggleStatusColumn = (statusId) => {
    setCollapsedStatuses((current) => ({ ...current, [statusId]: !current[statusId] }));
  };

  return (
    <div className="task-module">
      <div className="task-toolbar">
        <div className="task-toolbar-actions">
          <button type="button" className={`secondary-button compact task-filter-button ${showArchived ? '' : 'is-active'}`} onClick={() => setShowArchived(false)}>
            Actives
          </button>
          <button type="button" className={`secondary-button compact task-filter-button ${showArchived ? 'is-active' : ''}`} onClick={() => setShowArchived(true)}>
            Archive
          </button>
          {canCreateTask && typeof onOpenTaskModal === 'function' && (
            <button type="button" className="action-button task-primary-mobile-button" onClick={onOpenTaskModal}>
              <FontAwesomeIcon icon={faPlus} />
              Ajouter une tache
            </button>
          )}
          {canCreateSection && typeof onOpenSectionModal === 'function' && (
            <button type="button" className="secondary-button task-primary-mobile-button" onClick={onOpenSectionModal}>
              <FontAwesomeIcon icon={faPlus} />
              Ajouter une section
            </button>
          )}
        </div>
        {showTaskRecapControl ? (
          <div className={`task-toolbar-side ${useTopbarTaskRecapControl ? 'is-mobile-topbar-controlled' : ''}`}>
            <button type="button" className={`secondary-button compact recap-side-button ${isTaskRecapOpen ? 'is-active' : ''}`} onClick={toggleTaskRecap}>
              <FontAwesomeIcon icon={faPlus} />
              {isTaskRecapOpen ? 'Fermer recap' : 'Recap +'}
            </button>
          </div>
        ) : null}
      </div>

      {showTaskRecapControl && isTaskRecapOpen ?(
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal detail-modal task-recap-modal">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Recap chantier</p>
                <h3>{project.name}</h3>
                <p className="topbar-subcopy">Vue complete du chantier et de toutes ses taches en un clic.</p>
              </div>
              <button type="button" className="secondary-button compact" onClick={closeTaskRecap}>
                Fermer
              </button>
            </div>

            <div className="task-recap-grid">
              {recapItems.map((item) => (
                <div key={item.label} className="summary-card">
                  <div className="summary-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="project-info-grid">
              <div className="summary-card">
                <div className="summary-row"><span>Client</span><strong>{project.client || '-'}</strong></div>
                <div className="summary-row"><span>Adresse / site</span><strong>{project.site || '-'}</strong></div>
                <div className="summary-row"><span>Budget</span><strong>{project.budget || '-'}</strong></div>
                <div className="summary-row"><span>Periode</span><strong>{project.period || '-'}</strong></div>
                <div className="summary-row"><span>Statut</span><strong>{project.status || '-'}</strong></div>
                <div className="summary-row"><span>Progression</span><strong>{project.progress ?? 0}%</strong></div>
              </div>

              <div className="summary-card">
                <div className="summary-row"><span>Intervenants</span><strong>{project.participants?.length ?? 0}</strong></div>
                <div className="summary-row"><span>Documents</span><strong>{((project.documents?.length ?? 0) + (project.adminDocs?.length ?? 0))}</strong></div>
                <div className="summary-row"><span>Plans</span><strong>{project.plans?.length ?? 0}</strong></div>
                <div className="summary-row"><span>Conversations</span><strong>{project.conversations?.length ?? 0}</strong></div>
                <div className="summary-row"><span>Taches archivees</span><strong>{projectTasks.filter((task) => task.archived).length}</strong></div>
                <div className="summary-row"><span>Taches actives</span><strong>{projectTasks.filter((task) => !task.archived).length}</strong></div>
              </div>
            </div>

            <div className="summary-card project-info-block">
              <div className="summary-row">
                <span>Equipe chantier</span>
                <strong>{project.participants?.length ?? 0}</strong>
              </div>
              <div className="project-info-tags">
                {(project.participants ?? []).map((participant) => (
                  <span key={participant.id} className="pill pill-electric">
                    {participant.name} - {participant.role}
                  </span>
                ))}
              </div>
            </div>

            <div className="task-recap-sections">
              {recapSections.map((group) => (
                <div key={group.section} className="summary-card task-recap-section-card">
                  <div className="summary-row">
                    <span>{group.section}</span>
                    <strong>{group.tasks.length} tache(s)</strong>
                  </div>
                  {group.tasks.length ? (
                    <div className="task-recap-task-list">
                      {group.tasks.map((task) => (
                        <div key={task.id} className="task-recap-task-row">
                          <div className="task-recap-task-copy">
                            <strong>{task.title}</strong>
                            <small>{task.description || 'Aucune description'}</small>
                          </div>
                          <div className="task-recap-task-meta">
                            <span className={`pill ${getTaskStatusBadgeClass(task)}`}>{getTaskStatus(task)}</span>
                            {getTaskPriorityLabel(task.priority) === 'Urgent' ? (
                              <span className={`pill ${getTaskPriorityBadgeClass(task.priority)}`}>{getTaskPriorityLabel(task.priority)}</span>
                            ) : null}
                            <span className="pill">{task.assignees?.join(', ') || 'Non assigne'}</span>
                            <span className="pill">{task.dueDate || '-'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="summary-row">
                      <span>Aucune tache dans cette section</span>
                      <strong>-</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="section-selector">
        {(project.sections ?? []).map((section) => {
          const taskCount = scopedTasks.filter((task) => task.section === section).length;
          const isActive = selectedSection === section;
          return (
            <button
              key={section}
              type="button"
              className={`section-chip ${isActive ? 'is-active' : ''}`}
              onClick={() => setSelectedSection(section)}
            >
              <span>{section}</span>
              <span className="pill">{taskCount}</span>
            </button>
          );
        })}
      </div>

      {selectedSection ?(
        <div className="section-panel">
          <div className="section-panel-header">
            <div>
              <h3>{selectedSection}</h3>
              <p>{sectionTasks.length} tache{sectionTasks.length > 1 ? 's' : ''} dans cette section</p>
            </div>
          </div>
          <div className="project-task-board">
            {taskStatusOptions.map((status) => {
              const columnTasks = sectionTasks.filter((task) => getTaskStatus(task) === status.id);

              return (
                <div
                  key={status.id}
                  className={`project-task-column ${getTaskStatusToneClass(status.id)}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedTaskId && canUpdateTask) {
                      onSetTaskStatus(draggedTaskId, status.id);
                      setDraggedTaskId(null);
                    }
                  }}
                  onTouchEnd={() => {
                    if (draggedTaskId && canUpdateTask) {
                      onSetTaskStatus(draggedTaskId, status.id);
                      setDraggedTaskId(null);
                    }
                  }}
                >
                  <div className={`project-task-column-header ${getTaskStatusToneClass(status.id)}`}>
                    <strong>{isMobileTaskBoard ? getMobileTaskStatusLabel(status.id) : status.label}</strong>
                    <div className="task-column-header-actions">
                      <span className="pill">{columnTasks.length}</span>
                      <button
                        type="button"
                        className="icon-button task-column-toggle"
                        onClick={() => toggleStatusColumn(status.id)}
                        aria-label={collapsedStatuses[status.id] ? `Ouvrir ${status.label}` : `Fermer ${status.label}`}
                        title={collapsedStatuses[status.id] ? 'Ouvrir la colonne' : 'Fermer la colonne'}
                      >
                        <FontAwesomeIcon icon={faChevronDown} className={collapsedStatuses[status.id] ? '' : 'is-expanded'} />
                      </button>
                    </div>
                  </div>

                  {!collapsedStatuses[status.id] ? (
                    <div className="task-list project-task-column-list">
                    {columnTasks.length ?(
                      columnTasks.map((task) => {
                        const isOpen = openTaskId === task.id;
                        return (
                          <article
                            key={task.id}
                            className={`task-item ${getTaskStatusToneClass(getTaskStatus(task))} ${isOpen ? 'is-open' : ''}`}
                            draggable={canUpdateTask}
                            onDragStart={() => setDraggedTaskId(task.id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            onTouchStart={() => canUpdateTask && setDraggedTaskId(task.id)}
                          >
                            <div className={getTaskPriorityRibbonClass(task.priority)}>{getTaskPriorityLabel(task.priority)}</div>
                            <button
                              type="button"
                              className="task-summary"
                              onClick={() => {
                                if (isMobileTaskBoard) {
                                  setOpenTaskId(task.id);
                                  return;
                                }
                                setOpenTaskId((current) => (current === task.id ? null : task.id));
                              }}
                            >
                              <div className="task-summary-main">
                                <strong>{task.title}</strong>
                                <small>{task.assignees?.join(', ') || 'Non assigne'}</small>
                              </div>
                              <div className="task-summary-meta">
                                <span className={`pill ${getTaskStatusBadgeClass(task)}`}>{getTaskStatus(task)}</span>
                                <span className={`pill ${getTaskPriorityBadgeClass(task.priority)}`}>{getTaskPriorityLabel(task.priority)}</span>
                              </div>
                            </button>
                            {isOpen && !isMobileTaskBoard && (
                              <div className="task-details">
                                <div className="details-row">
                                  <span>Description</span>
                                  <strong>{task.description || '-'}</strong>
                                </div>
                                <div className="details-row">
                                  <span>Responsables</span>
                                  <strong>{task.assignees?.join(', ') || 'Non assigne'}</strong>
                                </div>
                                <div className="details-row">
                                  <span>Priorite</span>
                                  <strong>{task.priority}</strong>
                                </div>
                                <div className="details-row">
                                  <span>Statut</span>
                                  <strong>{getTaskStatus(task)}</strong>
                                </div>
                                <div className="details-row">
                                  <span>Date</span>
                                  <strong>{task.dueDate || '-'}</strong>
                                </div>
                                {(canUpdateTask || canDeleteTask || canArchiveTask) && (
                                  <div className="admin-doc-actions">
                                    {canUpdateTask && (
                                      <>
                                        {getTaskStatus(task) !== 'A faire' && (
                                          <button
                                            type="button"
                                            className="secondary-button compact"
                                            onClick={() => onSetTaskStatus(task.id, 'A faire')}
                                          >
                                            <FontAwesomeIcon icon={faArrowLeft} />
                                            {'A faire'}
                                          </button>
                                        )}
                                        {getTaskStatus(task) !== 'En cours' && (
                                          <button
                                            type="button"
                                            className="secondary-button compact"
                                            onClick={() => onSetTaskStatus(task.id, 'En cours')}
                                          >
                                            <FontAwesomeIcon icon={faEye} />
                                            En cours
                                          </button>
                                        )}
                                        {getTaskStatus(task) !== 'Terminee' && (
                                          <button
                                            type="button"
                                            className="secondary-button compact"
                                            onClick={() => onSetTaskStatus(task.id, 'Terminee')}
                                          >
                                            <FontAwesomeIcon icon={faArrowUp} />
                                            Terminer
                                          </button>
                                        )}
                                      </>
                                    )}
                                    {canDeleteTask && (
                                      <button type="button" className="icon-button danger" onClick={() => onDeleteTask(task.id)}>
                                        <FontAwesomeIcon icon={faTrash} />
                                      </button>
                                    )}
                                    {canArchiveTask ?(
                                      <button type="button" className="secondary-button compact archive-button" onClick={() => onToggleTaskArchived?.(task.id, !task.archived)}>
                                        {task.archived ? 'Restaurer' : 'Archiver'}
                                      </button>
                                    ) : null}
                                    {canUpdateTask && (
                                      <button type="button" className="secondary-button compact" onClick={() => setEditingTask(task)}>
                                        Modifier
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })
                    ) : (
                      <div className="summary-card">
                        <div className="summary-row">
                          <span>Aucune tache</span>
                          <strong>-</strong>
                        </div>
                      </div>
                    )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {openedMobileTask ?(
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal detail-modal task-detail-modal">
            <div className="panel-heading compact">
              <div>
                <h3>{openedMobileTask.title}</h3>
              </div>
              <button type="button" className="secondary-button compact" onClick={() => setOpenTaskId(null)}>
                Fermer
              </button>
            </div>
            <div className="details-card light-card">
              <div className="details-row">
                <span>Statut</span>
                <strong>{getTaskStatus(openedMobileTask)}</strong>
              </div>
              <div className="details-row">
                <span>Priorite</span>
                <strong>{getTaskPriorityLabel(openedMobileTask.priority)}</strong>
              </div>
              <div className="details-row">
                <span>Responsables</span>
                <strong>{openedMobileTask.assignees?.join(', ') || 'Non assigne'}</strong>
              </div>
              <div className="details-row">
                <span>Date</span>
                <strong>{openedMobileTask.dueDate || '-'}</strong>
              </div>
              <div className="details-row align-start">
                <span>Description</span>
                <strong>{openedMobileTask.description || '-'}</strong>
              </div>
              {(canUpdateTask || canDeleteTask || canArchiveTask) && (
                <div className="admin-doc-actions">
                  {canUpdateTask && getTaskStatus(openedMobileTask) !== 'A faire' ?(
                    <button type="button" className="secondary-button compact" onClick={() => { onSetTaskStatus(openedMobileTask.id, 'A faire'); setOpenTaskId(null); }}>
                      <FontAwesomeIcon icon={faArrowLeft} />
                      {'A faire'}
                    </button>
                  ) : null}
                  {canUpdateTask && getTaskStatus(openedMobileTask) !== 'En cours' ?(
                    <button type="button" className="secondary-button compact" onClick={() => { onSetTaskStatus(openedMobileTask.id, 'En cours'); setOpenTaskId(null); }}>
                      <FontAwesomeIcon icon={faEye} />
                      En cours
                    </button>
                  ) : null}
                  {canUpdateTask && getTaskStatus(openedMobileTask) !== 'Terminee' ?(
                    <button type="button" className="secondary-button compact" onClick={() => { onSetTaskStatus(openedMobileTask.id, 'Terminee'); setOpenTaskId(null); }}>
                      <FontAwesomeIcon icon={faArrowUp} />
                      Terminer
                    </button>
                  ) : null}
                  {canDeleteTask ?(
                    <button type="button" className="icon-button danger" onClick={() => { onDeleteTask(openedMobileTask.id); setOpenTaskId(null); }}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  ) : null}
                  {canArchiveTask ?(
                    <button type="button" className="secondary-button compact archive-button" onClick={() => { onToggleTaskArchived?.(openedMobileTask.id, !openedMobileTask.archived); setOpenTaskId(null); }}>
                      {openedMobileTask.archived ? 'Restaurer' : 'Archiver'}
                    </button>
                  ) : null}
                  {canUpdateTask ?(
                    <button type="button" className="secondary-button compact" onClick={() => { setEditingTask(openedMobileTask); setOpenTaskId(null); }}>
                      Modifier
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {editingTask && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal">
            <div className="panel-heading compact">
              <div>
                <h3>Modifier une tache</h3>
              </div>
            </div>
            <div className="form-grid">
              <label className="field field-full">
                <span>Titre</span>
                <input type="text" value={editingTask.title} onChange={(event) => setEditingTask((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label className="field field-full">
                <span>Description</span>
                <textarea className="field-textarea" value={editingTask.description} onChange={(event) => setEditingTask((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label className="field">
                <span>Type</span>
                <input type="text" value={editingTask.interventionType} onChange={(event) => setEditingTask((current) => ({ ...current, interventionType: event.target.value }))} />
              </label>
              <label className="field">
                <span>Priorite</span>
                <input type="text" value={editingTask.priority} onChange={(event) => setEditingTask((current) => ({ ...current, priority: event.target.value }))} />
              </label>
              <label className="field">
                <span>Date</span>
                <input type="date" value={editingTask.dueDate} onChange={(event) => setEditingTask((current) => ({ ...current, dueDate: event.target.value }))} />
              </label>
              <label className="field">
                <span>Section</span>
                <select value={editingTask.section} onChange={(event) => setEditingTask((current) => ({ ...current, section: event.target.value }))}>
                  {project.sections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setEditingTask(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="action-button"
                onClick={async () => {
                  await onUpdateTask?.({ taskId: editingTask.id, updates: editingTask, projectId: project.id, sectionIdMap: project.sectionIdMap || {} });
                  setEditingTask(null);
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function CompactActorsTab({ project }) {
  return <ActorsTab project={project} />;
}

function CompactPersonalTasksTab({ tasks, onDeleteTask, onSetTaskStatus, onToggleTaskArchived, showArchived, onToggleTaskArchivedView, onArchiveSection }) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [isMobileTaskBoard, setIsMobileTaskBoard] = useState(() => (typeof window !== 'undefined' ?window.innerWidth <= 480 : false));
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(true);
  const [collapsedStatuses, setCollapsedStatuses] = useState(() => Object.fromEntries(taskStatusOptions.map((status) => [status.id, true])));
  const sections = useMemo(() => {
    const names = Array.from(new Set((tasks ?? []).map((task) => (task.source || 'Personnel').trim() || 'Personnel')));
    return names.length ? names : ['Personnel'];
  }, [tasks]);
  const [selectedSection, setSelectedSection] = useState(sections[0] ?? 'Personnel');

  useEffect(() => {
    setSelectedSection((current) => (current && sections.includes(current) ? current : sections[0] ?? 'Personnel'));
  }, [sections]);

  useEffect(() => {
    setIsSectionCollapsed(true);
    setCollapsedStatuses(Object.fromEntries(taskStatusOptions.map((status) => [status.id, true])));
  }, [selectedSection, showArchived]);

  useEffect(() => {
    const syncViewport = () => setIsMobileTaskBoard(window.innerWidth <= 480);
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const sectionTasks = (tasks ?? []).filter((task) => ((task.source || 'Personnel').trim() || 'Personnel') === selectedSection);
  const openedMobileTask = isMobileTaskBoard ?sectionTasks.find((task) => task.id === openTaskId) ?? null : null;
  const toggleStatusColumn = (statusId) => {
    setCollapsedStatuses((current) => ({ ...current, [statusId]: !current[statusId] }));
  };

  return (
    <div className="task-module">
      <div className="task-toolbar">
        <div className="task-toolbar-actions">
          <button type="button" className={`secondary-button compact task-filter-button ${showArchived ? '' : 'is-active'}`} onClick={() => onToggleTaskArchivedView?.(false)}>
            Actifs
          </button>
          <button type="button" className={`secondary-button compact task-filter-button ${showArchived ? 'is-active' : ''}`} onClick={() => onToggleTaskArchivedView?.(true)}>
            Archives
          </button>
        </div>
      </div>

      <div className="section-selector">
        {sections.map((section) => {
          const taskCount = (tasks ?? []).filter((task) => ((task.source || 'Personnel').trim() || 'Personnel') === section).length;
          const isActive = selectedSection === section;
          return (
            <div key={section} className={`section-chip ${isActive ? 'is-active' : ''}`}>
              <button
                type="button"
                className="section-chip-main"
                onClick={() => setSelectedSection(section)}
              >
                <span>{section}</span>
                <span className="pill">{taskCount}</span>
              </button>
              <button
                type="button"
                className="section-chip-action"
                onClick={() => onArchiveSection?.(section, !showArchived)}
                aria-label={showArchived ? `Restaurer la section ${section}` : `Archiver la section ${section}`}
                title={showArchived ? 'Restaurer section' : 'Archiver section'}
              >
                <FontAwesomeIcon icon={showArchived ? faArrowUp : faBoxArchive} />
              </button>
            </div>
          );
        })}
      </div>

      {selectedSection ?(
        <div className="section-panel">
          <div className="section-panel-header">
            <div>
              <h3>{selectedSection}</h3>
              <p>{sectionTasks.length} tache{sectionTasks.length > 1 ? 's' : ''} dans cette section</p>
            </div>
            <div className="section-panel-actions">
              <button
                type="button"
                className="secondary-button compact section-toggle-button"
                onClick={() => setIsSectionCollapsed((current) => !current)}
                aria-label={isSectionCollapsed ? 'Ouvrir la section' : 'Fermer la section'}
                title={isSectionCollapsed ? 'Ouvrir la section' : 'Fermer la section'}
              >
                <FontAwesomeIcon icon={faChevronDown} className={isSectionCollapsed ? '' : 'is-expanded'} />
              </button>
            </div>
          </div>
          {!isSectionCollapsed ? (
            <div className="project-task-board">
            {taskStatusOptions.map((status) => {
              const columnTasks = sectionTasks.filter((task) => getTaskStatus(task) === status.id);

              return (
                <div
                  key={status.id}
                  className={`project-task-column ${getTaskStatusToneClass(status.id)}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedTaskId) {
                      onSetTaskStatus(draggedTaskId, status.id);
                      setDraggedTaskId(null);
                    }
                  }}
                  onTouchEnd={() => {
                    if (draggedTaskId) {
                      onSetTaskStatus(draggedTaskId, status.id);
                      setDraggedTaskId(null);
                    }
                  }}
                >
                  <div className={`project-task-column-header ${getTaskStatusToneClass(status.id)}`}>
                    <strong>{isMobileTaskBoard ? getMobileTaskStatusLabel(status.id) : status.label}</strong>
                    <div className="task-column-header-actions">
                      <span className="pill">{columnTasks.length}</span>
                      <button
                        type="button"
                        className="icon-button task-column-toggle"
                        onClick={() => toggleStatusColumn(status.id)}
                        aria-label={collapsedStatuses[status.id] ? `Ouvrir ${status.label}` : `Fermer ${status.label}`}
                        title={collapsedStatuses[status.id] ? 'Ouvrir la colonne' : 'Fermer la colonne'}
                      >
                        <FontAwesomeIcon icon={faChevronDown} className={collapsedStatuses[status.id] ? '' : 'is-expanded'} />
                      </button>
                    </div>
                  </div>

                  {!collapsedStatuses[status.id] ? (
                    <div className="task-list project-task-column-list">
                    {columnTasks.length ?(
                      columnTasks.map((task) => {
                        const isOpen = openTaskId === task.id;
                        return (
                          <article
                            key={task.id}
                            className={`task-item ${getTaskStatusToneClass(getTaskStatus(task))} ${isOpen ? 'is-open' : ''}`}
                            draggable
                            onDragStart={() => setDraggedTaskId(task.id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            onTouchStart={() => setDraggedTaskId(task.id)}
                          >
                            <div className={getTaskPriorityRibbonClass(task.priority)}>{getTaskPriorityLabel(task.priority)}</div>
                            <button
                              type="button"
                              className="task-summary"
                              onClick={() => {
                                if (isMobileTaskBoard) {
                                  setOpenTaskId(task.id);
                                  return;
                                }
                                setOpenTaskId((current) => (current === task.id ? null : task.id));
                              }}
                            >
                              <div className="task-summary-main">
                                <strong>{task.title}</strong>
                                <small>{task.dueDate || '-'}</small>
                              </div>
                              <div className="task-summary-meta">
                                <span className={`pill ${getTaskStatusBadgeClass(task)}`}>{getTaskStatus(task)}</span>
                            <span className={`pill ${getTaskPriorityBadgeClass(task.priority)}`}>{getTaskPriorityLabel(task.priority)}</span>
                              </div>
                            </button>
                            {isOpen && !isMobileTaskBoard && (
                              <div className="task-details">
                                <div className="details-row">
                                  <span>Description</span>
                                  <strong>{task.description || task.source || '-'}</strong>
                                </div>
                                <div className="details-row">
                                  <span>Priorite</span>
                                  <strong>{task.priority}</strong>
                                </div>
                                <div className="details-row">
                                  <span>Statut</span>
                                  <strong>{getTaskStatus(task)}</strong>
                                </div>
                                <div className="details-row">
                                  <span>Date</span>
                                  <strong>{task.dueDate || '-'}</strong>
                                </div>
                                <div className="admin-doc-actions">
                                  {!showArchived && getTaskStatus(task) !== 'A faire' && (
                                    <button type="button" className="secondary-button compact" onClick={() => onSetTaskStatus(task.id, 'A faire')}>
                                      <FontAwesomeIcon icon={faArrowLeft} />
                                      {'A faire'}
                                    </button>
                                  )}
                                  {!showArchived && getTaskStatus(task) !== 'En cours' && (
                                    <button type="button" className="secondary-button compact" onClick={() => onSetTaskStatus(task.id, 'En cours')}>
                                      <FontAwesomeIcon icon={faEye} />
                                      En cours
                                    </button>
                                  )}
                                  {!showArchived && getTaskStatus(task) !== 'Terminee' && (
                                    <button type="button" className="secondary-button compact" onClick={() => onSetTaskStatus(task.id, 'Terminee')}>
                                      <FontAwesomeIcon icon={faArrowUp} />
                                      Terminer
                                    </button>
                                  )}
                                  {onToggleTaskArchived ? (
                                    <button type="button" className="secondary-button compact archive-button" onClick={() => onToggleTaskArchived(task.id, !task.archived)}>
                                      {task.archived ? 'Restaurer' : 'Archiver'}
                                    </button>
                                  ) : null}
                                  <button type="button" className="icon-button danger" onClick={() => onDeleteTask(task.id)}>
                                    <FontAwesomeIcon icon={faTrash} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })
                    ) : (
                      <div className="summary-card">
                        <div className="summary-row">
                          <span>Aucune tache</span>
                          <strong>-</strong>
                        </div>
                      </div>
                    )}
                    </div>
                  ) : null}
                </div>
              );
            })}
            </div>
          ) : null}
        </div>
      ) : null}

      {openedMobileTask ?(
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal detail-modal">
            <div className="panel-heading compact">
              <div>
                <h3>{openedMobileTask.title}</h3>
              </div>
              <button type="button" className="secondary-button compact" onClick={() => setOpenTaskId(null)}>
                Fermer
              </button>
            </div>
            <div className="details-card light-card">
              <div className="details-row">
                <span>Statut</span>
                <strong>{getTaskStatus(openedMobileTask)}</strong>
              </div>
              <div className="details-row">
                <span>Priorite</span>
                <strong>{getTaskPriorityLabel(openedMobileTask.priority)}</strong>
              </div>
              <div className="details-row">
                <span>Date</span>
                <strong>{openedMobileTask.dueDate || '-'}</strong>
              </div>
              <div className="details-row align-start">
                <span>Description</span>
                <strong>{openedMobileTask.description || openedMobileTask.source || '-'}</strong>
              </div>
              <div className="admin-doc-actions task-detail-actions">
                {!showArchived && getTaskStatus(openedMobileTask) !== 'A faire' ?(
                  <button type="button" className="secondary-button compact" onClick={() => { onSetTaskStatus(openedMobileTask.id, 'A faire'); setOpenTaskId(null); }}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                    {'A faire'}
                  </button>
                ) : null}
                {!showArchived && getTaskStatus(openedMobileTask) !== 'En cours' ?(
                  <button type="button" className="secondary-button compact" onClick={() => { onSetTaskStatus(openedMobileTask.id, 'En cours'); setOpenTaskId(null); }}>
                    <FontAwesomeIcon icon={faEye} />
                    En cours
                  </button>
                ) : null}
                {!showArchived && getTaskStatus(openedMobileTask) !== 'Terminee' ?(
                  <button type="button" className="secondary-button compact" onClick={() => { onSetTaskStatus(openedMobileTask.id, 'Terminee'); setOpenTaskId(null); }}>
                    <FontAwesomeIcon icon={faArrowUp} />
                    Terminer
                  </button>
                ) : null}
                {onToggleTaskArchived ?(
                  <button type="button" className="secondary-button compact archive-button" onClick={() => { onToggleTaskArchived(openedMobileTask.id, !openedMobileTask.archived); setOpenTaskId(null); }}>
                    {openedMobileTask.archived ? 'Restaurer' : 'Archiver'}
                  </button>
                ) : null}
                <button type="button" className="icon-button danger" onClick={() => { onDeleteTask(openedMobileTask.id); setOpenTaskId(null); }}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TasksSection({ project, projects, personalTasks: sourcePersonalTasks, onSavePersonalTask, onUpdateTask, onDeleteTask, onArchiveTask }) {
  const [taskScope, setTaskScope] = useState('personnel');
  const [showArchivedPersonalTasks, setShowArchivedPersonalTasks] = useState(false);
  const [personalTasks, setPersonalTasks] = useState(sourcePersonalTasks);
  const [projectTaskMap, setProjectTaskMap] = useState(
    Object.fromEntries(projects.map((item) => [item.id, item.tasks]))
  );
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isPersonalTaskModalOpen, setIsPersonalTaskModalOpen] = useState(false);
  const [newPersonalTask, setNewPersonalTask] = useState({
    title: '',
    dueDate: '',
    priority: 'Pas urgent',
    source: 'Personnel',
  });
  const [isCreatingPersonalSection, setIsCreatingPersonalSection] = useState(false);

  useEffect(() => {
    setPersonalTasks(sourcePersonalTasks);
    setProjectTaskMap(Object.fromEntries(projects.map((item) => [item.id, item.tasks])));
  }, [project, projects, sourcePersonalTasks]);

  useEffect(() => {
    setSelectedProjectId((current) => (current && projects.some((item) => item.id === current) ? current : null));
  }, [projects]);

  const savePersonalTask = async () => {
    if (!newPersonalTask.title.trim()) {
      return;
    }

    const sectionName = (newPersonalTask.source || '').trim() || 'Personnel';

    const optimisticTask = {
      id: `personal-task-${Date.now()}`,
      title: newPersonalTask.title.trim(),
      dueDate: newPersonalTask.dueDate || new Date().toISOString().slice(0, 10),
      priority: newPersonalTask.priority,
      source: sectionName,
      description: sectionName,
      status: 'A faire',
    };
    setPersonalTasks((current) => [optimisticTask, ...current]);
    const result = await onSavePersonalTask?.({
      title: newPersonalTask.title.trim(),
      dueDate: newPersonalTask.dueDate || new Date().toISOString().slice(0, 10),
      priority: newPersonalTask.priority,
      source: sectionName,
    });
    if (result === null) {
      setPersonalTasks((current) => current.filter((task) => task.id !== optimisticTask.id));
      return;
    }
    setNewPersonalTask({ title: '', dueDate: '', priority: 'Pas urgent', source: sectionName });
    setIsCreatingPersonalSection(false);
    setIsPersonalTaskModalOpen(false);
  };

  const movePersonalTask = async (taskId, nextStatus) => {
    setPersonalTasks((current) =>
      current.map((task) => (task.id !== taskId ?task : updateTaskStatus(task, nextStatus)))
    );
    await onUpdateTask?.({ taskId, updates: { status: nextStatus }, projectId: null, sectionIdMap: {} });
  };

  const deletePersonalTask = async (taskId) => {
    setPersonalTasks((current) => current.filter((task) => task.id !== taskId));
    await onDeleteTask?.(taskId);
  };

  const togglePersonalTaskArchived = async (taskId, archived) => {
    setPersonalTasks((current) =>
      current.map((task) => (
        task.id !== taskId
          ? task
          : {
              ...task,
              archived,
              status: archived ? 'Terminee' : 'A faire',
              completed: archived ? true : false,
            }
      ))
    );
    await onArchiveTask?.({ taskId, archived, projectId: null });
  };

  const visiblePersonalTasks = personalTasks.filter((task) => Boolean(task.archived) === showArchivedPersonalTasks);
  const activePersonalTasksCount = personalTasks.filter((task) => !task.archived).length;
  const archivedPersonalTasksCount = personalTasks.filter((task) => task.archived).length;
  const personalSections = useMemo(() => {
    const sections = Array.from(new Set(
      personalTasks
        .map((task) => (task.source || 'Personnel').trim() || 'Personnel')
        .filter(Boolean)
    ));
    return sections.length ? sections : ['Personnel'];
  }, [personalTasks]);

  const archivePersonalSection = async (sectionName, archived) => {
    const sectionTasks = personalTasks.filter((task) => ((task.source || 'Personnel').trim() || 'Personnel') === sectionName && Boolean(task.archived) !== archived);
    if (!sectionTasks.length) {
      return;
    }

    setPersonalTasks((current) =>
      current.map((task) => {
        const taskSection = (task.source || 'Personnel').trim() || 'Personnel';
        if (taskSection !== sectionName) {
          return task;
        }

        return {
          ...task,
          archived,
          status: archived ? 'Terminee' : 'A faire',
          completed: archived,
        };
      })
    );

    await Promise.all(sectionTasks.map((task) => onArchiveTask?.({ taskId: task.id, archived, projectId: null })));
  };

  const setProjectTaskStatus = async (projectId, taskId, status) => {
    setProjectTaskMap((current) => ({
      ...current,
      [projectId]: (current[projectId] ?? []).map((task) =>
        task.id !== taskId ?task : updateTaskStatus(task, status)
      ),
    }));
    await onUpdateTask?.({ taskId, updates: { status }, projectId, sectionIdMap: {} });
  };

  const deleteProjectTask = async (projectId, taskId) => {
    setProjectTaskMap((current) => ({
      ...current,
      [projectId]: (current[projectId] ?? []).filter((task) => task.id !== taskId),
    }));
    await onDeleteTask?.(taskId);
  };

  return (
    <section className="panel light-panel compact-screen">
      <div className="panel-heading compact dense-heading">
        <div>
          <h3>Gestion des taches</h3>
        </div>
      </div>

      <div className="tasks-scope-switch">
        <button
          type="button"
          className={`tab-button ${taskScope === 'personnel' ? 'is-active' : ''}`}
          onClick={() => setTaskScope('personnel')}
        >
          Personnel
        </button>
        <button
          type="button"
          className={`tab-button ${taskScope === 'projet' ? 'is-active' : ''}`}
          onClick={() => setTaskScope('projet')}
        >
          Projet
        </button>
      </div>

      {taskScope === 'personnel' && (
        <div className="tasks-dashboard single-column">
          <article className="light-card tasks-dashboard-card">
            <div className="panel-heading compact">
              <div>
                <h3>{'Mes taches'}</h3>
              </div>
              <div className="header-actions">
                <span className="pill pill-electric">
                  {showArchivedPersonalTasks ? archivedPersonalTasksCount : activePersonalTasksCount} {showArchivedPersonalTasks ? 'archivees' : 'actives'}
                </span>
                <button type="button" className="action-button compact" onClick={() => setIsPersonalTaskModalOpen(true)}>
                  <FontAwesomeIcon icon={faPlus} />
                  Ajouter
                </button>
              </div>
            </div>
            <CompactPersonalTasksTab
              tasks={visiblePersonalTasks}
              onDeleteTask={deletePersonalTask}
              onSetTaskStatus={movePersonalTask}
              onArchiveSection={archivePersonalSection}
              onToggleTaskArchived={togglePersonalTaskArchived}
              showArchived={showArchivedPersonalTasks}
              onToggleTaskArchivedView={setShowArchivedPersonalTasks}
            />
          </article>
        </div>
      )}

      {taskScope === 'projet' && (
        <div className="tasks-dashboard single-column">
          <div className="project-task-selector">
            {projects.map((projectItem) => {
              const tasks = projectTaskMap[projectItem.id] ?? [];
              const activeTasks = tasks.filter((task) => getTaskStatus(task) !== 'Terminee').length;
              const isSelected = selectedProjectId === projectItem.id;

              return (
                <button
                  key={projectItem.id}
                  type="button"
                  className={`project-task-tile ${isSelected ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedProjectId((current) => (current === projectItem.id ? null : projectItem.id));
                  }}
                >
                  <span className="project-task-tile-name">{projectItem.name}</span>
                  <span className="project-task-tile-site">{projectItem.site || '-'}</span>
                  <span className="project-task-tile-meta">
                    <strong>{activeTasks}</strong>
                    <small>actives</small>
                  </span>
                </button>
              );
            })}
          </div>

          {projects
            .filter((projectItem) => projectItem.id === selectedProjectId)
            .map((projectItem) => {
              const tasks = projectTaskMap[projectItem.id] ?? [];

              return (
                <article key={projectItem.id} className="light-card tasks-dashboard-card project-task-card">
                  <CompactProjectTasksTab
                    canArchiveTask={false}
                    canCreateSection={false}
                    canCreateTask={false}
                    canDeleteTask={true}
                    canUpdateTask={true}
                    onDeleteTask={(taskId) => deleteProjectTask(projectItem.id, taskId)}
                    onOpenSectionModal={null}
                    onOpenTaskModal={null}
                    onSetTaskStatus={(taskId, status) => setProjectTaskStatus(projectItem.id, taskId, status)}
                    onToggleSection={() => {}}
                    onToggleTaskArchived={null}
                    onUpdateTask={async ({ taskId, updates }) => onUpdateTask?.({ taskId, updates, projectId: projectItem.id, sectionIdMap: {} })}
                    openSections={{}}
                    project={{ ...projectItem, tasks }}
                    showTaskRecapControl={false}
                  />
                </article>
              );
            })}
        </div>
      )}

      {isPersonalTaskModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Personnel</p>
                <h3>{'Ajouter une tache'}</h3>
              </div>
            </div>
            <div className="form-grid">
              <label className="field field-full">
                <span>Titre</span>
                <input
                  type="text"
                  value={newPersonalTask.title}
                  onChange={(event) => setNewPersonalTask((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Echeance</span>
                <input
                  type="date"
                  value={newPersonalTask.dueDate}
                  onChange={(event) => setNewPersonalTask((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Priorite</span>
                <select
                  value={newPersonalTask.priority}
                  onChange={(event) => setNewPersonalTask((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="Pas urgent">Pas urgent</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </label>
              <label className="field field-full">
                <span>Section</span>
                <select
                  value={isCreatingPersonalSection ? '__new__' : (newPersonalTask.source || 'Personnel')}
                  onChange={(event) => {
                    if (event.target.value === '__new__') {
                      setIsCreatingPersonalSection(true);
                      setNewPersonalTask((current) => ({ ...current, source: '' }));
                      return;
                    }
                    setIsCreatingPersonalSection(false);
                    setNewPersonalTask((current) => ({ ...current, source: event.target.value }));
                  }}
                >
                  {personalSections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                  <option value="__new__">Nouvelle section</option>
                </select>
              </label>
              {isCreatingPersonalSection ? (
                <label className="field field-full">
                  <span>Nom de la nouvelle section</span>
                  <input
                    type="text"
                    value={newPersonalTask.source}
                    onChange={(event) => setNewPersonalTask((current) => ({ ...current, source: event.target.value }))}
                    placeholder="Ex. Administratif, Relances, Personnel"
                  />
                </label>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setIsPersonalTaskModalOpen(false)}>
                Annuler
              </button>
              <button type="button" className="action-button" onClick={savePersonalTask}>
                <FontAwesomeIcon icon={faPlus} />
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MessagesSection({ directMessages = [], friends = [], preferredConversationId = null, currentUserName, onSendMessage, onOpenPrivateDiscussion }) {
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attachmentSort, setAttachmentSort] = useState('recent');
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const threadBodyRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const initialMessagesByConversation = useMemo(
    () => Object.fromEntries((directMessages ?? []).map((conversation) => [conversation.id, conversation.messages ?? []])),
    [directMessages]
  );
  const [messagesByConversation, setMessagesByConversation] = useState(initialMessagesByConversation);

  useEffect(() => {
    setMessagesByConversation((current) => ({
      ...initialMessagesByConversation,
      ...current,
    }));
  }, [initialMessagesByConversation]);

  useEffect(() => {
    if (!preferredConversationId) {
      return;
    }

    const preferredConversationExists = (directMessages ?? []).some((conversation) => conversation.id === preferredConversationId);
    if (preferredConversationExists) {
      setSelectedConversationId(preferredConversationId);
    }
  }, [preferredConversationId, directMessages]);

  const conversationRows = (directMessages ?? [])
    .map((conversation) => {
      const thread = messagesByConversation[conversation.id] ?? conversation.messages ?? [];
      const lastMessage = thread[thread.length - 1];
      const preview = lastMessage?.attachment
        ?`${lastMessage.attachment.kind === 'image' ? 'Photo' : 'Piece jointe'} : ${lastMessage.attachment.name}`
        : (lastMessage?.text ?? conversation.preview ?? 'Aucun message');

      return {
        ...conversation,
        preview,
        lastTime: lastMessage?.time ?? '08:42',
        sortTimestamp: lastMessage?.timestamp || conversation.updatedAt || null,
      };
    })
    .filter((conversation) => {
      const query = searchTerm.trim().toLowerCase();
      if (!query) {
        return true;
      }
      return conversation.name.toLowerCase().includes(query) || conversation.preview.toLowerCase().includes(query);
    })
    .sort((left, right) => {
      const leftValue = left.sortTimestamp ? new Date(left.sortTimestamp).getTime() : 0;
      const rightValue = right.sortTimestamp ? new Date(right.sortTimestamp).getTime() : 0;
      return rightValue - leftValue;
    });

  const selectedConversation =
    conversationRows.find((conversation) => conversation.id === selectedConversationId)
    ?? (directMessages ?? []).find((conversation) => conversation.id === selectedConversationId)
    ?? null;

  const thread = useMemo(
    () => (selectedConversation ? (messagesByConversation[selectedConversation.id] ?? []) : []),
    [messagesByConversation, selectedConversation]
  );

  const attachments = useMemo(() => (
    thread
      .filter((message) => message.attachment)
      .map((message) => ({
        id: message.id,
        author: message.author,
        time: message.time,
        attachment: message.attachment,
      }))
      .sort((left, right) => {
        const [leftHour = '0', leftMinute = '0'] = (left.time ?? '00:00').split(':');
        const [rightHour = '0', rightMinute = '0'] = (right.time ?? '00:00').split(':');
        const leftValue = Number(leftHour) * 60 + Number(leftMinute);
        const rightValue = Number(rightHour) * 60 + Number(rightMinute);

        if (attachmentSort === 'oldest') {
          return leftValue - rightValue;
        }

        if (attachmentSort === 'images') {
          if (left.attachment.kind === right.attachment.kind) {
            return rightValue - leftValue;
          }
          return left.attachment.kind === 'image' ?-1 : 1;
        }

        if (attachmentSort === 'files') {
          if (left.attachment.kind === right.attachment.kind) {
            return rightValue - leftValue;
          }
          return left.attachment.kind === 'file' ?-1 : 1;
        }

        return rightValue - leftValue;
      })
  ), [attachmentSort, thread]);

  const scrollThreadToBottom = (behavior = 'smooth') => {
    const node = threadBodyRef.current;
    if (!node) {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior });
  };

  const updateStickiness = () => {
    const node = threadBodyRef.current;
    if (!node) {
      return;
    }
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 48;
  };

  useEffect(() => {
    shouldStickToBottomRef.current = true;
    scrollThreadToBottom('auto');
  }, [selectedConversationId]);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      scrollThreadToBottom('smooth');
    }
  }, [thread.length, selectedConversation?.id]);

  const sendMessage = async () => {
    const content = messageDraft.trim();
    if (!content || !selectedConversation) {
      return;
    }

    const time = new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
    setMessagesByConversation((current) => ({
      ...current,
      [selectedConversation.id]: [
        ...(current[selectedConversation.id] ?? []),
        {
          id: `${selectedConversation.id}-${Date.now()}`,
          author: 'Vous',
          text: content,
          time,
          timestamp: new Date().toISOString(),
          own: true,
          status: 'Envoye',
          attachment: null,
        },
      ],
    }));
    await onSendMessage?.({ conversationId: selectedConversation.id, text: content });
    setMessageDraft('');
  };

  const addAttachmentToConversation = async (file, kind) => {
    if (!file || !selectedConversation) {
      return;
    }

    const time = new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
    const attachment = {
      name: file.name,
      mimeType: file.type,
      sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} Ko`,
      url: URL.createObjectURL(file),
      kind,
    };

    setMessagesByConversation((current) => ({
      ...current,
      [selectedConversation.id]: [
        ...(current[selectedConversation.id] ?? []),
        {
          id: `${selectedConversation.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          author: currentUserName || 'Vous',
          text: attachment.kind === 'image' ?`Photo envoyee : ${attachment.name}` : `Piece jointe : ${attachment.name}`,
          time,
          timestamp: new Date().toISOString(),
          own: true,
          status: 'Envoye',
          attachment,
        },
      ],
    }));
    await onSendMessage?.({ conversationId: selectedConversation.id, text: '', file });
    setIsAttachmentsOpen(true);
  };

  const handleGallerySelection = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      addAttachmentToConversation(file, file.type.startsWith('image/') ? 'image' : 'file');
    }
    event.target.value = '';
  };

  const handleCameraSelection = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      addAttachmentToConversation(file, 'image');
    }
    event.target.value = '';
  };

  return (
    <section className="panel light-panel compact-screen messages-screen">
      <div className={`messages-app ${selectedConversation ? 'has-open-thread' : ''}`}>
        {!selectedConversation ?(
          <div className="messages-list-panel">
            <div className="messages-list-top">
              <div>
                <strong>Conversations</strong>
                <small>Chantiers, contacts et echanges recents</small>
              </div>
              <span className="pill">{conversationRows.length}</span>
            </div>
            <div className="messages-search">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher une discussion"
              />
            </div>
            {conversationRows.length ?(
              <div className="messages-conversation-list">
                {conversationRows.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className="message-list-card"
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <span className="message-list-avatar">{conversation.name.slice(0, 2).toUpperCase()}</span>
                    <span className="message-list-main">
                      <span className="message-list-head">
                        <strong>{conversation.name}</strong>
                        <small>{conversation.lastTime}</small>
                      </span>
                      <small className="message-list-preview">{conversation.preview}</small>
                    </span>
                    <span className="message-list-meta">
                      {conversation.unread ?<span className="pill pill-electric">{conversation.unread}</span> : <small>Lu</small>}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state-card">
                <strong>Aucune conversation</strong>
                <p>Demarrez un echange avec un contact pour le faire remonter ici.</p>
                <div className="friends-grid friends-grid-inline">
                  {(friends ?? []).slice(0, 6).map((friend) => (
                    <button key={friend.id || friend.userId || friend.email} type="button" className="friend-inline-card" onClick={() => onOpenPrivateDiscussion?.(friend)}>
                      <span className="friend-inline-avatar">{friend.name?.slice(0, 2).toUpperCase()}</span>
                      <span className="friend-inline-main">
                        <strong>{friend.name}</strong>
                        <small>{friend.trade || 'Contact'}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="messages-thread is-visible">
            <div className="messages-thread-header">
              <div className="conversation-header-main">
                <button
                  type="button"
                  className="actors-back-button messages-back-button"
                  onClick={() => {
                    setSelectedConversationId(null);
                    setIsAttachmentsOpen(false);
                  }}
                >
                  <FontAwesomeIcon icon={faArrowLeft} />
                </button>
                <span className="conversation-avatar large">{selectedConversation.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{selectedConversation.name}</strong>
                </div>
              </div>
              <div className="thread-actions">
                <button
                  type="button"
                  className="secondary-button compact"
                  onClick={() => setIsAttachmentsOpen((current) => !current)}
                >
                  <FontAwesomeIcon icon={faPaperclip} />
                  Pieces jointes
                </button>
              </div>
            </div>
            {isAttachmentsOpen ?(
              <div className="attachments-panel">
                <div className="attachments-panel-head">
                  <strong>Pieces jointes</strong>
                  <select value={attachmentSort} onChange={(event) => setAttachmentSort(event.target.value)}>
                    <option value="recent">Recentes</option>
                    <option value="oldest">Anciennes</option>
                    <option value="images">Photos d'abord</option>
                    <option value="files">Fichiers d'abord</option>
                  </select>
                </div>
                <div className="attachments-list">
                  {attachments.length > 0 ?(
                    attachments.map((item) => (
                      <a
                        key={item.id}
                        className="attachment-item"
                        href={item.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="attachment-item-icon">
                          <FontAwesomeIcon icon={item.attachment.kind === 'image' ?faImage : faFile} />
                        </span>
                        <span className="attachment-item-main">
                          <strong>{item.attachment.name}</strong>
                          <small>{item.author}  {item.time}  {item.attachment.sizeLabel}</small>
                        </span>
                      </a>
                    ))
                  ) : (
                    <p className="attachments-empty">Aucune piece jointe dans cette discussion.</p>
                  )}
                </div>
              </div>
            ) : null}
            <div className="messages-thread-body" ref={threadBodyRef} onScroll={updateStickiness}>
              {thread.map((message) => (
                <div key={message.id} className={`chat-row ${message.own ? 'is-own' : ''}`}>
                  <article className={`chat-bubble ${message.own ? 'is-own' : ''}`}>
                    {!message.own ?<strong>{message.author}</strong> : null}
                    {message.attachment?.kind === 'image' ?(
                      <a href={message.attachment.url} target="_blank" rel="noreferrer" className="chat-attachment-preview">
                        <img src={message.attachment.url} alt={message.attachment.name} className="chat-image-preview" />
                      </a>
                    ) : null}
                    <p>{message.text}</p>
                    {message.attachment?.kind === 'file' ?(
                      <a href={message.attachment.url} target="_blank" rel="noreferrer" className="chat-attachment-link">
                        <FontAwesomeIcon icon={faFile} />
                        <span>{message.attachment.name}</span>
                      </a>
                    ) : null}
                    <small>{message.time}{message.own && message.status ?`  ${message.status}` : ''}</small>
                  </article>
                </div>
              ))}
            </div>
            <div className="messages-composer">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="messages-hidden-input"
                onChange={handleGallerySelection}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="messages-hidden-input"
                onChange={handleCameraSelection}
              />
              <button type="button" className="icon-button" onClick={() => galleryInputRef.current?.click()} aria-label="Ajouter une piece jointe">
                <FontAwesomeIcon icon={faPaperclip} />
              </button>
              <button type="button" className="icon-button" onClick={() => cameraInputRef.current?.click()} aria-label="Prendre une photo">
                <FontAwesomeIcon icon={faCamera} />
              </button>
              <textarea
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ecrire un message"
                rows={3}
              />
              <button type="button" className="action-button messages-send-button" onClick={sendMessage}>
                <FontAwesomeIcon icon={faPaperPlane} />
                Envoyer
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
function FriendsSection({ friends, invitations = [], currentUserStatus, onChangeCurrentUserStatus, onInviteFriend, onOpenPrivateDiscussion, onRespondToInvitation, onRemoveFriend }) {
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [startedChats, setStartedChats] = useState([]);
  const [friendsTab, setFriendsTab] = useState('friends');
  const [presenceFilter, setPresenceFilter] = useState('online');
  const [friendSearchTerm, setFriendSearchTerm] = useState('');
  const [friendInviteForm, setFriendInviteForm] = useState({ name: '', trade: '', email: '' });
  const [isMobileFriends, setIsMobileFriends] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 767 : false));

  useEffect(() => {
    const syncViewport = () => setIsMobileFriends(window.innerWidth <= 767);
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const getFriendDetails = (friend) => {
    const slug = friend.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
    const tradeMeta = {
      Architecte: {
        company: 'Atelier Signature',
        city: 'Bruxelles',
        skills: ['Plans', 'Details', 'Suivi esthetique'],
      },
      Entrepreneur: {
        company: 'Structure & Co',
        city: 'Uccle',
        skills: ['Coordination', 'Planning', 'Execution'],
      },
      Cliente: {
        company: 'Client prive',
        city: 'Watermael-Boitsfort',
        skills: ['Validation', 'Decisions', 'Suivi budget'],
      },
    };

    const meta = tradeMeta[friend.trade] ?? {
      company: 'Reseau Build In Peace',
      city: 'Bruxelles',
      skills: ['Coordination', 'Suivi', 'Echanges'],
    };

    return {
      email: `${slug}@buildinpeace.be`,
      phone: '+32 470 11 22 33',
      company: meta.company,
      city: meta.city,
      skills: meta.skills,
      note: friend.status === 'En ligne' ? 'Disponible pour demarrer un echange immediat.' : 'Discussion disponible des ouverture de conversation.',
    };
  };

  const getFriendTone = (friend) => {
    if (friend.status === 'En ligne') {
      return 'online';
    }
    if (friend.status === 'Occupe') {
      return 'busy';
    }
    return 'offline';
  };

  const openDiscussion = (friend) => {
    setStartedChats((current) => (current.includes(friend.id) ?current : [friend.id, ...current]));
    onOpenPrivateDiscussion?.(friend);
  };

  const orderedFriends = [...friends].sort((left, right) => {
    const leftStarted = startedChats.includes(left.id) ?1 : 0;
    const rightStarted = startedChats.includes(right.id) ?1 : 0;
    return rightStarted - leftStarted;
  });

  const filteredFriends = orderedFriends.filter((friend) => {
    if (presenceFilter === 'online') return friend.status === 'En ligne';
    if (presenceFilter === 'offline') return friend.status !== 'En ligne';
    return true;
  }).filter((friend) => {
    const query = friendSearchTerm.trim().toLowerCase();
    if (!query) return true;
    return [friend.name, friend.trade, friend.company, friend.city]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const pendingFriendInvitations = invitations.filter((invite) => invite.status === 'pending');

  const handleFriendInvitationResponse = async (inviteId, decision) => {
    await onRespondToInvitation?.(inviteId, decision);
    if (decision === 'accepted') {
      setFriendsTab('friends');
    }
  };

  return (
    <section className="panel light-panel compact-screen friends-screen friends-screen-wide">
      <div className="panel-heading compact dense-heading">
        <div>
          <h3>Amis et partenaires</h3>
        </div>
        <div className="header-actions">
          <span className="pill pill-electric">
            {friendsTab === 'friends' ? `${filteredFriends.length} contacts` : `${pendingFriendInvitations.length} invitations`}
          </span>
          <button type="button" className="action-button compact" onClick={() => setIsAddFriendOpen(true)}>
            <FontAwesomeIcon icon={faPlus} />
            Ajouter
          </button>
        </div>
      </div>

      <div className="project-row-head">
        <div className="task-tabs" aria-label="Navigation amis">
          <button type="button" className={`tab-button ${friendsTab === 'friends' ? 'is-active' : ''}`} onClick={() => setFriendsTab('friends')}>
            Amis
          </button>
          <button type="button" className={`tab-button ${friendsTab === 'invitations' ? 'is-active' : ''}`} onClick={() => setFriendsTab('invitations')}>
            Invitations
            {pendingFriendInvitations.length ? <span className="pill pill-electric">{pendingFriendInvitations.length}</span> : null}
          </button>
        </div>
      </div>

      {friendsTab === 'friends' ? (
        <>
          <div className="messages-search">
            <input
              type="text"
              value={friendSearchTerm}
              onChange={(event) => setFriendSearchTerm(event.target.value)}
              placeholder="Rechercher un ami"
            />
          </div>

          <div className="project-row-head">
            <div className="task-tabs" aria-label="Filtrer les contacts">
              <button type="button" className={`tab-button ${presenceFilter === 'online' ? 'is-active' : ''}`} onClick={() => setPresenceFilter('online')}>
                En ligne
              </button>
              <button type="button" className={`tab-button ${presenceFilter === 'offline' ? 'is-active' : ''}`} onClick={() => setPresenceFilter('offline')}>
                Hors ligne
              </button>
            </div>
          </div>

          <div className="friends-grid friends-grid-inline">
            {filteredFriends.map((friend) => {
              const details = getFriendDetails(friend);
              const tone = getFriendTone(friend);
              const hasChat = startedChats.includes(friend.id);
              return (
                <article key={friend.id} className={`friend-card friend-card-${tone}`}>
                  <button type="button" className="friend-card-main" onClick={() => (isMobileFriends ? setSelectedFriend(friend) : openDiscussion(friend))}>
                    <div className="friend-card-head">
                      <span className="friend-avatar">{friend.name.slice(0, 2).toUpperCase()}</span>
                      <div className="friend-card-copy">
                        <strong>{friend.name}</strong>
                        <small>{friend.trade}</small>
                      </div>
                      <span className={`friend-status friend-status-${tone}`}>{friend.status === 'Occupe' ? 'Occupe' : friend.status}</span>
                    </div>
                    <div className="friend-card-body">
                      <span>{details.company}</span>
                      <span>{details.city}</span>
                    </div>
                  </button>
                  <div className="friend-card-actions">
                    <button type="button" className={`action-button compact friend-action friend-action-${tone === 'offline' ? 'offline' : 'online'}`} onClick={() => openDiscussion(friend)}>
                      <FontAwesomeIcon icon={faComments} />
                      {hasChat ? 'Discussion creee' : 'Discuter'}
                    </button>
                    <button type="button" className="secondary-button compact friend-action friend-action-info" onClick={() => setSelectedFriend(friend)}>
                      <FontAwesomeIcon icon={faCircleInfo} />
                      Infos
                    </button>
                    {friend.friendshipId ? (
                      <button type="button" className="secondary-button compact friend-action" onClick={() => onRemoveFriend?.(friend)}>
                        <FontAwesomeIcon icon={faTrash} />
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {filteredFriends.length === 0 ?(
              <article className="friend-card">
                <div className="friend-card-main">
                  <div className="friend-card-copy">
                    <strong>Aucun contact</strong>
                    <small>Aucun profil ne correspond a ce filtre.</small>
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        </>
      ) : (
        <div className="friend-invitations-panel">
          <div className="panel-heading compact">
            <div>
              <strong>Invitations d'amis</strong>
              <small>{pendingFriendInvitations.length} en attente</small>
            </div>
          </div>
          <div className="friend-invitations-list">
            {pendingFriendInvitations.length ? pendingFriendInvitations.map((invite) => (
              <article key={invite.id} className="friend-invite-card">
                <div className="friend-invite-copy">
                  <strong>{invite.name}</strong>
                  <small>{invite.trade || 'Partenaire'}</small>
                </div>
                <div className="friend-invite-actions">
                  <button type="button" className="secondary-button compact" onClick={() => handleFriendInvitationResponse(invite.id, 'refused')}>
                    Refuser
                  </button>
                  <button type="button" className="action-button compact" onClick={() => handleFriendInvitationResponse(invite.id, 'accepted')}>
                    Accepter
                  </button>
                </div>
              </article>
            )) : (
              <article className="friend-card">
                <div className="friend-card-main">
                  <div className="friend-card-copy">
                    <strong>Aucune invitation</strong>
                    <small>Les nouvelles demandes d'amis apparaitront ici.</small>
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>
      )}

      {selectedFriend && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal detail-modal friend-info-modal">
            <div className="panel-heading compact">
              <div>
                <h3>{selectedFriend.name}</h3>
              </div>
              <button type="button" className="secondary-button compact" onClick={() => setSelectedFriend(null)}>
                Fermer
              </button>
            </div>
            <div className="details-card light-card friend-info-card">
              <div className="details-row">
                <span>Metier</span>
                <strong>{selectedFriend.trade}</strong>
              </div>
              <div className="details-row">
                <span>Statut</span>
                <strong>{selectedFriend.status}</strong>
              </div>
              <div className="details-row">
                <span>Societe</span>
                <strong>{getFriendDetails(selectedFriend).company}</strong>
              </div>
              <div className="details-row">
                <span>Telephone</span>
                <strong>{getFriendDetails(selectedFriend).phone}</strong>
              </div>
              <div className="details-row">
                <span>Ville</span>
                <strong>{getFriendDetails(selectedFriend).city}</strong>
              </div>
              <div className="details-row align-start">
                <span>Competences</span>
                <strong>{getFriendDetails(selectedFriend).skills.join(', ')}</strong>
              </div>
              <div className="details-row align-start">
                <span>Note</span>
                <strong>{getFriendDetails(selectedFriend).note}</strong>
              </div>
              <button type="button" className="action-button compact" onClick={() => openDiscussion(selectedFriend)}>
                <FontAwesomeIcon icon={faComments} />
                Demarrer une discussion
              </button>
              {selectedFriend.friendshipId ? (
                <button
                  type="button"
                  className="secondary-button compact"
                  onClick={async () => {
                    await onRemoveFriend?.(selectedFriend);
                    setSelectedFriend(null);
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} />
                  Supprimer cet ami
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {isAddFriendOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal detail-modal friend-info-modal">
            <div className="panel-heading compact">
              <div>
                <h3>Inviter un contact</h3>
              </div>
              <button type="button" className="secondary-button compact" onClick={() => setIsAddFriendOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Nom</span>
                <input
                  type="text"
                  placeholder="Nom du contact"
                  value={friendInviteForm.name}
                  onChange={(event) => setFriendInviteForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Metier</span>
                <input
                  type="text"
                  placeholder="Specialite"
                  value={friendInviteForm.trade}
                  onChange={(event) => setFriendInviteForm((current) => ({ ...current, trade: event.target.value }))}
                />
              </label>
              <label className="field field-full">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="nom@entreprise.be"
                  value={friendInviteForm.email}
                  onChange={(event) => setFriendInviteForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button compact" onClick={() => setIsAddFriendOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="action-button compact"
                onClick={() => {
                  onInviteFriend?.(friendInviteForm);
                  setFriendInviteForm({ name: '', trade: '', email: '' });
                  setIsAddFriendOpen(false);
                }}
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function ProfileSection({ profileForm, onChangeProfile, onSaveProfile, onSignOut }) {
  const initialProfile = {
    name: demoWorkspace.user.name,
    role: demoWorkspace.user.role,
    company: demoWorkspace.user.company,
    email: demoWorkspace.user.email,
    phone: demoWorkspace.user.phone,
    city: demoWorkspace.user.city,
    avatarUrl: demoWorkspace.user.avatarUrl ?? '',
    status: demoWorkspace.user.status ?? 'En ligne',
    summary: 'Coordination generale, suivi chantier, echanges partenaires et validation des etapes cles.',
    specialty: 'Coordination chantier',
    availability: 'Disponible en journee',
    zone: 'Bruxelles et Brabant wallon',
    website: 'www.buildinpeace.be',
  };
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(initialProfile);
  const [avatarFile, setAvatarFile] = useState(null);
  const updateDraftField = (field) => (event) => {
    setProfileDraft((current) => ({ ...current, [field]: event.target.value }));
  };
  const updateProfileAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setAvatarFile(file);
    setProfileDraft((current) => ({
      ...current,
      avatarUrl: URL.createObjectURL(file),
    }));
  };

  useEffect(() => {
    if (!isProfileEditOpen) {
      setProfileDraft(profileForm);
    }
  }, [profileForm, isProfileEditOpen]);

  return (
    <section className="panel light-panel compact-screen profile-screen profile-screen-wide">
      <div className="profile-shell">
        <div className="profile-hero-card">
          <div className="profile-top-actions">
            <button
              type="button"
              className="secondary-button compact profile-edit-toggle"
              onClick={() => {
                setProfileDraft(profileForm);
                setIsProfileEditOpen(true);
              }}
            >
              Modifier
            </button>
            <button type="button" className="secondary-button compact profile-signout-toggle" onClick={() => onSignOut?.()}>
              Deconnexion
            </button>
          </div>
          <div className="profile-hero-top">
            <div className="profile-identity-card">
              <div className="profile-avatar-panel">
                {profileForm.avatarUrl ? (
                  <img src={profileForm.avatarUrl} alt={profileForm.name} className="profile-avatar-large profile-avatar-image" />
                ) : (
                  <span className="profile-avatar-large">{profileForm.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="profile-showcase-copy">
                <div className="profile-edit-banner profile-edit-banner-inline">
                  <span className="profile-card-kicker">Identite</span>
                </div>
                <div className="profile-inline-topline">
                  <span className="profile-inline-title">{profileForm.name}</span>
                  <div className="profile-status-switch">
                    <button
                      type="button"
                      className={`profile-status-button ${profileForm.status === 'En ligne' ? 'is-active is-online' : ''}`}
                    >
                      En ligne
                    </button>
                    <button
                      type="button"
                      className={`profile-status-button ${profileForm.status === 'Hors ligne' ? 'is-active is-offline' : ''}`}
                    >
                      Hors ligne
                    </button>
                  </div>
                </div>
                <p className="profile-hero-note">Profil principal utilise dans les echanges chantier et les discussions.</p>
                <div className="profile-hero-meta">
                  <span className={`friend-status ${profileForm.status === 'En ligne' ? 'friend-status-online' : 'friend-status-offline'}`}>
                    {profileForm.status}
                  </span>
                  {profileForm.email ? <span className="profile-hero-meta-item">{profileForm.email}</span> : null}
                  {profileForm.phone ? <span className="profile-hero-meta-item">{profileForm.phone}</span> : null}
                </div>
                <div className="profile-quick-grid">
                  <div className="profile-quick-tile profile-quick-tile-accent">
                    <span>Specialite</span>
                    <strong>{profileForm.specialty}</strong>
                  </div>
                  <div className="profile-quick-tile profile-quick-tile-soft">
                    <span>Disponibilite</span>
                    <strong>{profileForm.availability}</strong>
                  </div>
                  <div className="profile-quick-tile profile-quick-tile-soft">
                    <span>Zone</span>
                    <strong>{profileForm.zone}</strong>
                  </div>
                  <div className="profile-quick-tile profile-quick-tile-accent">
                    <span>Societe</span>
                    <strong>{profileForm.company}</strong>
                  </div>
                </div>
                <div className="profile-edit-summary profile-edit-summary-inline">
                  <>
                    <div className="details-row"><span>Email</span><strong>{profileForm.email}</strong></div>
                    <div className="details-row"><span>Telephone</span><strong>{profileForm.phone}</strong></div>
                    <div className="details-row"><span>Role</span><strong>{profileForm.role}</strong></div>
                    <div className="details-row"><span>Societe</span><strong>{profileForm.company}</strong></div>
                    <div className="details-row"><span>Ville</span><strong>{profileForm.city}</strong></div>
                    <div className="details-row"><span>Specialite</span><strong>{profileForm.specialty}</strong></div>
                    <div className="details-row"><span>Disponibilite</span><strong>{profileForm.availability}</strong></div>
                    <div className="details-row"><span>Zone</span><strong>{profileForm.zone}</strong></div>
                    <div className="details-row"><span>Site web</span><strong>{profileForm.website}</strong></div>
                  </>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isProfileEditOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal profile-edit-modal">
            <div className="section-header">
              <div>
                <p className="eyebrow">Profil</p>
                <h3>Modifier la fiche</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setProfileDraft(profileForm);
                  setAvatarFile(null);
                  setIsProfileEditOpen(false);
                }}
              >
                Fermer
              </button>
            </div>
            <div className="profile-edit-modal-grid">
              <div className="profile-edit-modal-avatar">
                <div className="profile-avatar-panel">
                  {profileDraft.avatarUrl ? (
                    <img src={profileDraft.avatarUrl} alt={profileDraft.name} className="profile-avatar-large profile-avatar-image" />
                  ) : (
                    <span className="profile-avatar-large">{profileDraft.name.slice(0, 2).toUpperCase()}</span>
                  )}
                  <label className="secondary-button compact profile-avatar-upload">
                    Changer la photo
                    <input type="file" accept="image/*" className="messages-hidden-input" onChange={updateProfileAvatar} />
                  </label>
                </div>
              </div>
              <div className="profile-edit-form">
                <label className="details-row align-start"><span>Nom</span><input type="text" value={profileDraft.name} onChange={updateDraftField('name')} className="profile-card-input" /></label>
                <label className="details-row align-start"><span>Email</span><input type="email" value={profileDraft.email} onChange={updateDraftField('email')} className="profile-card-input" /></label>
                <label className="details-row align-start"><span>Telephone</span><input type="text" value={profileDraft.phone} onChange={updateDraftField('phone')} className="profile-card-input" /></label>
                <label className="details-row align-start"><span>Role</span><input type="text" value={profileDraft.role} onChange={updateDraftField('role')} className="profile-card-input" /></label>
                <label className="details-row align-start"><span>Societe</span><input type="text" value={profileDraft.company} onChange={updateDraftField('company')} className="profile-card-input" /></label>
                <label className="details-row align-start"><span>Ville</span><input type="text" value={profileDraft.city} onChange={updateDraftField('city')} className="profile-card-input" /></label>
                <label className="details-row align-start"><span>Specialite</span><input type="text" value={profileDraft.specialty} onChange={updateDraftField('specialty')} className="profile-card-input" /></label>
                <label className="details-row align-start"><span>Disponibilite</span><input type="text" value={profileDraft.availability} onChange={updateDraftField('availability')} className="profile-card-input" /></label>
                <label className="details-row align-start"><span>Zone</span><input type="text" value={profileDraft.zone} onChange={updateDraftField('zone')} className="profile-card-input" /></label>
                <label className="details-row align-start"><span>Site web</span><input type="text" value={profileDraft.website} onChange={updateDraftField('website')} className="profile-card-input" /></label>
                <div className="profile-edit-status">
                  <span>Statut</span>
                  <div className="profile-status-switch">
                    <button
                      type="button"
                      className={`profile-status-button ${profileDraft.status === 'En ligne' ? 'is-active is-online' : ''}`}
                      onClick={() => setProfileDraft((current) => ({ ...current, status: 'En ligne' }))}
                    >
                      En ligne
                    </button>
                    <button
                      type="button"
                      className={`profile-status-button ${profileDraft.status === 'Hors ligne' ? 'is-active is-offline' : ''}`}
                      onClick={() => setProfileDraft((current) => ({ ...current, status: 'Hors ligne' }))}
                    >
                      Hors ligne
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="profile-actions-bar">
              <div className="profile-showcase-actions">
                <button
                  type="button"
                  className="secondary-button compact"
                  onClick={() => {
                    setProfileDraft(profileForm);
                    setAvatarFile(null);
                    setIsProfileEditOpen(false);
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="action-button compact"
                  onClick={() => {
                    onChangeProfile((current) => ({ ...current, ...profileDraft }));
                    onSaveProfile?.(profileDraft, avatarFile);
                    setIsProfileEditOpen(false);
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

function AccessManagementModal({
  currentUserName,
  onClose,
  onSave,
  participants,
}) {
  const [draftParticipants, setDraftParticipants] = useState(participants);
  const [selectedParticipantId, setSelectedParticipantId] = useState(participants[0]?.id ?? null);

  useEffect(() => {
    setDraftParticipants(participants);
    setSelectedParticipantId((current) => {
      if (participants.some((participant) => participant.id === current)) {
        return current;
      }
      return participants[0]?.id ?? null;
    });
  }, [participants]);

  const updateDraftParticipant = (participantId, updater) => {
    setDraftParticipants((current) =>
      current.map((participant) => (participant.id !== participantId ?participant : updater(participant)))
    );
  };

  const applyAllTabPermissions = (participantId, checked) => {
    const nextPermissions = Object.fromEntries(permissionOptions.map((permission) => [permission.key, checked]));
    updateDraftParticipant(participantId, (participant) => ({ ...participant, permissions: nextPermissions }));
  };

  const visibleParticipants = draftParticipants.filter((participant) => participant.id === selectedParticipantId);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card light-modal detail-modal access-modal">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Acces</p>
            <h3>Gerer les intervenants</h3>
            <p className="topbar-subcopy">Role d'abord, puis onglets visibles pour chaque intervenant.</p>
          </div>
          <button type="button" className="secondary-button compact" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="access-mobile-picker">
          <p className="access-mobile-picker-title">Gerer les acces de...</p>
          <div className="access-mobile-picker-list">
            {draftParticipants.map((participant) => (
              <button
                key={participant.id}
                type="button"
                className={`access-mobile-person-chip ${participant.id === selectedParticipantId ? 'is-active' : ''}`}
                onClick={() => setSelectedParticipantId(participant.id)}
              >
                <span className="access-mobile-person-avatar">{participant.name.slice(0, 2).toUpperCase()}</span>
                <span className="access-mobile-person-copy">
                  <strong>{participant.name}</strong>
                  <small>{participant.company || getNormalizedRole(participant.role)}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="access-list">
          {visibleParticipants.map((participant) => {
            const normalizedRole = getNormalizedRole(participant.role);
            const isCurrentUser = participant.name === currentUserName;
            const effectivePermissions = mergePermissions(normalizedRole, participant.permissions);
            return (
              <article key={participant.id} className="access-row-card">
                <div className="access-row-header">
                  <div className="access-person">
                    <div className="access-avatar">{participant.name.slice(0, 2).toUpperCase()}</div>
                    <div className="list-row-main">
                      <strong>{participant.name}</strong>
                      <small>{participant.company}</small>
                    </div>
                  </div>
                  <div className="access-controls">
                    <span className="pill">{participant.status}</span>
                    {isCurrentUser ?<span className="pill pill-electric">Vous</span> : null}
                  </div>
                </div>

                <div className="access-row-body">
                  <div className="access-role-panel">
                    <label className="field">
                      <span>Role</span>
                      <select
                        className="module-select access-select"
                        disabled={isCurrentUser}
                        value={normalizedRole}
                        onChange={(event) =>
                          updateDraftParticipant(participant.id, (current) => ({ ...current, role: event.target.value }))
                        }
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="icon-button danger"
                      disabled={isCurrentUser}
                      onClick={() =>
                        setDraftParticipants((current) =>
                          current.filter((item) => item.id !== participant.id || item.name === currentUserName)
                        )
                      }
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>

                  <div className="access-permissions-panel">
                    <div className="access-permissions-header">
                      <span>Onglets visibles</span>
                      <strong>{permissionOptions.filter((permission) => effectivePermissions[permission.key]).length}/{permissionOptions.length}</strong>
                    </div>
                    <div className="access-bulk-actions">
                      <button
                        type="button"
                        className="secondary-button compact"
                        disabled={isCurrentUser}
                        onClick={() => applyAllTabPermissions(participant.id, true)}
                      >
                        Tout selectionner
                      </button>
                      <button
                        type="button"
                        className="secondary-button compact"
                        disabled={isCurrentUser}
                        onClick={() => applyAllTabPermissions(participant.id, false)}
                      >
                        Tout deselectionner
                      </button>
                    </div>
                    <div className="access-permissions-grid">
                      {permissionOptions.map((permission) => (
                        <label key={permission.key} className="access-permission-chip">
                          <input
                            type="checkbox"
                            checked={Boolean(effectivePermissions[permission.key])}
                            disabled={isCurrentUser}
                            onChange={(event) =>
                              updateDraftParticipant(participant.id, (current) => ({
                                ...current,
                                permissions: { ...(current.permissions ?? {}), [permission.key]: event.target.checked },
                              }))
                            }
                          />
                          <span>{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="action-button" onClick={() => onSave?.(draftParticipants)}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectInfoModal({ onClose, project }) {
  const totalDocuments = (project.documents?.length ?? 0) + (project.adminDocs?.length ?? 0);
  const activeTasks = (project.tasks ?? []).filter((task) => !task.archived && !task.completed).length;
  const completedTasks = (project.tasks ?? []).filter((task) => task.completed && !task.archived).length;
  const archivedTasks = (project.tasks ?? []).filter((task) => task.archived).length;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card light-modal detail-modal project-info-modal">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Chantier</p>
            <h3>{project.name}</h3>
            <p className="topbar-subcopy">Recapitulatif complet du chantier.</p>
          </div>
          <button type="button" className="secondary-button compact" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="project-info-grid">
          <div className="summary-card">
            <div className="summary-row"><span>Client</span><strong>{project.client || '-'}</strong></div>
            <div className="summary-row"><span>Adresse / site</span><strong>{project.site || '-'}</strong></div>
            <div className="summary-row"><span>Budget</span><strong>{project.budget || '-'}</strong></div>
            <div className="summary-row"><span>Periode</span><strong>{project.period || '-'}</strong></div>
            <div className="summary-row"><span>Statut</span><strong>{project.status || '-'}</strong></div>
            <div className="summary-row"><span>Progression</span><strong>{project.progress ?? 0}%</strong></div>
          </div>

          <div className="summary-card">
            <div className="summary-row"><span>Intervenants</span><strong>{project.participants?.length ?? 0}</strong></div>
            <div className="summary-row"><span>Sections</span><strong>{project.sections?.length ?? 0}</strong></div>
            <div className="summary-row"><span>Taches actives</span><strong>{activeTasks}</strong></div>
            <div className="summary-row"><span>Taches terminO "Oaes</span><strong>{completedTasks}</strong></div>
            <div className="summary-row"><span>Taches archivO "Oaes</span><strong>{archivedTasks}</strong></div>
            <div className="summary-row"><span>Documents</span><strong>{totalDocuments}</strong></div>
            <div className="summary-row"><span>Plans</span><strong>{project.plans?.length ?? 0}</strong></div>
            <div className="summary-row"><span>Conversations</span><strong>{project.conversations?.length ?? 0}</strong></div>
          </div>
        </div>

        <div className="summary-card project-info-block">
          <div className="summary-row">
            <span>Intervenants</span>
            <strong>{project.participants?.length ?? 0}</strong>
          </div>
          <div className="project-info-tags">
            {(project.participants ?? []).map((participant) => (
              <span key={participant.id} className="pill pill-electric">{participant.name}  -  {participant.role}</span>
            ))}
          </div>
        </div>

        <div className="summary-card project-info-block">
          <div className="summary-row">
            <span>Sections</span>
            <strong>{project.sections?.length ?? 0}</strong>
          </div>
          <div className="project-info-tags">
            {(project.sections ?? []).map((section) => (
              <span key={section} className="pill">{section}</span>
            ))}
          </div>
        </div>

        <div className="summary-card project-info-block">
          <div className="summary-row">
            <span>Dernieres activites</span>
            <strong>{project.timeline?.length ?? 0}</strong>
          </div>
          <div className="project-info-timeline">
            {(project.timeline ?? []).slice(0, 8).map((item) => (
              <div key={item.id} className="summary-row">
                <span>{item.label}</span>
                <strong>{item.date}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationCenterModal({ notifications, onClose, onMarkAllRead }) {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card light-modal detail-modal invitation-center-modal notification-center-modal">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Notifications</p>
            <h3>Centre de notifications</h3>
            <p className="topbar-subcopy">{unreadCount} non lues</p>
          </div>
          <div className="workspace-modal-actions">
            <button type="button" className="secondary-button compact" onClick={onMarkAllRead} disabled={!unreadCount}>
              Tout marquer comme lu
            </button>
            <button type="button" className="secondary-button compact" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>

        <div className="invitation-list">
          {notifications.length ?(
            notifications.map((notification) => (
              <article
                key={notification.id}
                className={`list-row-button invitation-row invitation-row-compact notification-row ${notification.isRead ? 'is-read' : 'is-unread'}`}
              >
                <div className="list-row-main">
                  <strong>{notification.title}</strong>
                  <small>{notification.body || 'Aucun detail supplementaire.'}</small>
                </div>
                <div className="access-controls notification-row-meta">
                  <span className={`pill ${notification.isRead ? '' : 'pill-electric'}`}>{notification.isRead ? 'Lu' : 'Non lu'}</span>
                  <small>{notification.createdLabel}</small>
                </div>
              </article>
            ))
          ) : (
            <div className="summary-card">
              <div className="summary-row">
                <span>Aucune notification</span>
                <strong>0</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InvitationCenterModal({ invitations, onClose, onRespond }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card light-modal detail-modal invitation-center-modal">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Invitations</p>
            <h3>Mes invitations chantier</h3>
          </div>
          <button type="button" className="secondary-button compact" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="invitation-list">
          {invitations.length ?(
            invitations.map((invitation) => (
              <article key={invitation.id} className="list-row-button invitation-row invitation-row-compact">
                <div className="list-row-main">
                  <strong>{invitation.projectName}</strong>
                  <small>{[invitation.client, invitation.site, invitation.role].filter(Boolean).join('  -  ')}</small>
                </div>
                <div className="access-controls">
                  <span className="pill">{invitation.status}</span>
                  {invitation.status === 'pending' ?(
                    <>
                      <button type="button" className="secondary-button compact" onClick={() => onRespond(invitation.id, 'refused')}>
                        Refuser
                      </button>
                      <button type="button" className="action-button compact" onClick={() => onRespond(invitation.id, 'accepted')}>
                        Accepter
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="summary-card">
              <div className="summary-row">
                <span>Aucune invitation</span>
                <strong>0</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, detail, icon, compact = false }) {
  return (
    <article className={`metric-box light-metric ${compact ? 'compact-metric-box' : ''}`}>
      <div className="metric-topline">
        <span>{label}</span>
        <FontAwesomeIcon icon={icon} className="metric-icon" />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default WorkspaceV2;
