import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Canvas as FabricCanvas, Circle as FabricCircle, FabricImage, Group as FabricGroup, Rect as FabricRect, Textbox } from 'fabric';
import {
  faArrowLeft,
  faArrowDown,
  faArrowUp,
  faBuilding,
  faCamera,
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
import { demoWorkspace } from '../data/demoData';

const primaryNav = [
  { id: 'overview', label: 'Pilotage', icon: faLayerGroup },
  { id: 'projects', label: 'Chantiers', icon: faBuilding },
  { id: 'tasks', label: 'T\u00e2ches', icon: faClipboardList },
  { id: 'messages', label: 'Messages', icon: faComments },
  { id: 'friends', label: 'Amis', icon: faUserFriends },
  { id: 'profile', label: 'Profil', icon: faUserGear },
];

const chantierTabs = [
  { id: 'Administratif', label: 'Administratif', icon: faFileCircleCheck },
  { id: 'Documents', label: 'Documents', icon: faFolderOpen },
  { id: 'Plan', label: 'Plan', icon: faLayerGroup },
  { id: 'Taches', label: 'T\u00e2ches', icon: faClipboardList },
  { id: 'Acteurs', label: 'Acteurs', icon: faUsers },
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
  status: 'En attente',
  fileName: '',
};

const adminDocTypeOptions = ['Offres', 'Factures', 'Contrats', 'Assurances', 'Avancement'];

const initialDocumentForm = {
  id: null,
  category: '',
  subcategory: '',
  name: '',
  version: 'v1',
  status: 'Publi\u00e9',
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
  { id: 'luminaire', label: 'Lumière', short: 'LUM', type: 'marker', color: '#d97706' },
  { id: 'eau', label: 'Eau', short: 'EAU', type: 'marker', color: '#0284c7' },
  { id: 'evacuation', label: 'Évac.', short: 'EV', type: 'marker', color: '#7c3aed' },
  { id: 'reserve', label: 'Réserve', short: 'RSV', type: 'marker', color: '#dc2626' },
  { id: 'cercle', label: 'Cercle', short: 'O', type: 'circle', color: '#dc2626' },
  { id: 'cote', label: 'Cote', short: 'C', type: 'text', color: '#1f2937', text: 'Cote' },
  { id: 'zone', label: 'Zone', short: 'ZN', type: 'rect', color: '#2563eb' },
  { id: 'note', label: 'Note', short: 'N', type: 'text', color: '#111827', text: 'Note' },
];

const getNormalizedRole = (role) => roleAliases[role] ?? role ?? '';
const getProjectActorConversations = (project) => {
  if (!project) {
    return [];
  }

  const currentUserName = demoWorkspace.user.name;
  const generalConversation = {
    id: 'general-site',
    name: 'Discussion générale',
    participants: project.participants.length,
    unread: 2,
    preview: 'Canal commun pour tout le chantier.',
    private: false,
  };

  const privateConversations = project.participants
    .filter((participant) => participant.name !== currentUserName)
    .map((participant) => ({
      id: `actor-${participant.id}`,
      name: participant.name,
      participants: 2,
      unread: 0,
      preview: `Discussion privée avec ${participant.name}`,
      private: true,
      roleLabel: getNormalizedRole(participant.role),
    }));

  const baseConversations = [generalConversation, ...privateConversations];
  const baseConversationIds = new Set(baseConversations.map((conversation) => conversation.id));
  const extraConversations = (project.conversations ?? []).filter((conversation) => !baseConversationIds.has(conversation.id));

  return [...baseConversations, ...extraConversations];
};
const taskStatusOptions = [
  { id: '\u00c0 faire', label: '\u00c0 faire' },
  { id: 'En cours', label: 'En cours' },
  { id: 'Termin\u00e9e', label: 'Termin\u00e9es' },
];

const getTaskStatus = (task) => {
  if (task.status === 'Termin\u00e9e' || task.completed) {
    return 'Termin\u00e9e';
  }
  if (task.status === 'En cours') {
    return 'En cours';
  }
  return '\u00c0 faire';
};

const updateTaskStatus = (task, status) => ({
  ...task,
  status,
  completed: status === 'Termin\u00e9e',
});

function WorkspaceV2() {
  const workspaceRole = getNormalizedRole(demoWorkspace.user.role);
  const workspacePermissions = rolePermissions[workspaceRole] ?? {};
  const [projects, setProjects] = useState(demoWorkspace.projects);
  const [currentUserProfile, setCurrentUserProfile] = useState({
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
  });
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
  const [taskView, setTaskView] = useState('À faire');
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
    priority: 'Moyenne',
  });
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects]
  );

  const currentParticipant = useMemo(
    () => activeProject?.participants.find((participant) => participant.name === demoWorkspace.user.name),
    [activeProject]
  );

  const currentRole = useMemo(() => getNormalizedRole(currentParticipant?.role), [currentParticipant]);

  const availableTabs = useMemo(() => {
    if (!currentRole) {
      return [];
    }
    return rolePermissions[currentRole]?.tabs ?? [];
  }, [currentRole]);

  const projectPermissions = useMemo(() => {
    if (!currentRole) {
      return {};
    }
    return rolePermissions[currentRole] ?? {};
  }, [currentRole]);

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

  const openPrivateDiscussionWithFriend = (friend) => {
    const fallbackProject = activeProject ?? projects[0];
    if (!fallbackProject) {
      return;
    }

    const conversationId = `friend-${friend.id}`;
    const conversationName = friend.name;
    const preview = `Discussion privée avec ${friend.name}`;

    setProjects((currentProjects) => currentProjects.map((project) => {
      if (project.id !== fallbackProject.id) {
        return project;
      }

      const existingConversation = project.conversations.find((conversation) => conversation.id === conversationId);
      if (existingConversation) {
        return project;
      }

      return {
        ...project,
        conversations: [
          {
            id: conversationId,
            name: conversationName,
            participants: 2,
            unread: 0,
            preview,
            private: true,
          },
          ...project.conversations,
        ],
      };
    }));

    setActiveProjectId(fallbackProject.id);
    setPreferredConversationId(conversationId);
    setActiveSection('messages');
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
        company: newProjectParticipant.company.trim() || 'Entreprise à préciser',
        role: getNormalizedRole(newProjectParticipant.role),
        status: 'Invité',
      },
    ]);
    setNewProjectParticipant(initialProjectParticipantForm);
  };

  const removeProjectParticipant = (participantId) => {
    setProjectParticipants((current) =>
      current.filter((participant) => participant.id !== participantId || participant.locked)
    );
  };

  const handleCreateProject = () => {
    const { name, client, site, budget, startDate, endDate, sectionsInput } = newProject;
    const existingProject = projects.find((project) => project.id === editingProjectId) ?? null;
    if (!name.trim() || !projectParticipants.length || !site.trim() || !startDate || !endDate) {
      return;
    }

    const normalizedSections = sectionsInput
      .split(',')
      .map((section) => section.trim())
      .filter(Boolean);

    const createdProject = {
      id: editingProjectId ?? `project-${Date.now()}`,
      name: name.trim(),
      client: client.trim() || 'Client à préciser',
      site: site.trim(),
      status: existingProject?.status ?? 'Preparation',
      progress: existingProject?.progress ?? 0,
      budget: budget.trim() || 'À définir',
      startDate,
      endDate,
      period: `${startDate} -> ${endDate}`,
      participants: projectParticipants.map(({ locked, email, ...participant }) => participant),
      sections: normalizedSections.length ? normalizedSections : ['Général chantier'],
      adminDocs: existingProject?.adminDocs ?? [],
      documents: existingProject?.documents ?? [],
      plans: existingProject?.plans ?? [],
      tasks: existingProject?.tasks ?? [],
      conversations: existingProject?.conversations ?? [],
      timeline: existingProject?.timeline ?? [{ id: `timeline-${Date.now()}`, label: 'Chantier créé', date: startDate, tone: 'info' }],
    };

    setProjects((currentProjects) =>
      editingProjectId
        ? currentProjects.map((project) => (project.id === editingProjectId ? createdProject : project))
        : [createdProject, ...currentProjects]
    );
    setActiveProjectId(createdProject.id);
    setActiveProjectTab('Administratif');
    setNewProject(initialProjectForm);
    setProjectParticipants([]);
    setNewProjectParticipant(initialProjectParticipantForm);
    setEditingProjectId(null);
    setCreateStep(1);
    setIsCreateModalOpen(false);
  };

  const handleInvite = () => {
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
                  status: 'Invité',
                },
              ],
            }
      )
    );

    setInviteForm({ email: '', role: 'Entrepreneur' });
    setIsInviteModalOpen(false);
  };

  const toggleSection = (section) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const addSection = () => {
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
    setOpenSections((current) => ({ ...current, [newSectionName]: true }));
    setNewSectionName('');
    setIsSectionModalOpen(false);
  };

  const saveTask = () => {
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
      status: 'À faire',
      completed: false,
      archived: false,
    };
    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id !== activeProject.id ?project : { ...project, tasks: [...project.tasks, task] }))
    );
    setNewTask({
      title: '',
      description: '',
      interventionType: '',
      dueDate: '',
      section: '',
      assignees: [],
      priority: 'Moyenne',
    });
    setTaskStep(1);
    setIsTaskModalOpen(false);
  };

  const toggleTaskCompleted = (taskId, nextStatus = null) => {
    if (!projectPermissions.updateTask || !activeProject) {
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
                  ? task
                  : updateTaskStatus(task, nextStatus ?? (getTaskStatus(task) === 'Terminée' ? 'À faire' : 'Terminée'))
              ),
            }
      )
    );
  };

  const deleteTask = (taskId) => {
    if (!projectPermissions.deleteTask || !activeProject) {
      return;
    }
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id ?project : { ...project, tasks: project.tasks.filter((task) => task.id !== taskId) }
      )
    );
  };

  const updateTask = (taskId, updates) => {
    if (!activeProject) {
      return;
    }
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              tasks: project.tasks.map((task) => (task.id !== taskId ? task : { ...task, ...updates })),
            }
      )
    );
  };

  const upsertAdminDoc = (doc) => {
    if (!activeProject) {
      return;
    }
    const nextDoc = { ...doc, id: doc.id ?? `ad-${Date.now()}` };
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              adminDocs: doc.id
                ? project.adminDocs.map((item) => (item.id === doc.id ? nextDoc : item))
                : [nextDoc, ...project.adminDocs],
            }
      )
    );
  };

  const upsertDocument = (doc) => {
    if (!activeProject) {
      return;
    }
    const nextDoc = { ...doc, id: doc.id ?? `doc-${Date.now()}` };
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              documents: doc.id
                ? project.documents.map((item) => (item.id === doc.id ? nextDoc : item))
                : [nextDoc, ...project.documents],
            }
      )
    );
  };

  const upsertPlan = (plan) => {
    if (!activeProject) {
      return;
    }
    const nextPlan = { ...plan, id: plan.id ?? `pl-${Date.now()}` };
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              plans: plan.id
                ? project.plans.map((item) => (item.id === plan.id ? nextPlan : item))
                : [nextPlan, ...project.plans],
            }
      )
    );
  };

  const updateParticipantRole = (participantId, role) => {
    if (!projectPermissions.manageAccess || !activeProject) {
      return;
    }
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : {
              ...project,
              participants: project.participants.map((participant) =>
                participant.id !== participantId ?participant : { ...participant, role: getNormalizedRole(role) }
              ),
            }
      )
    );
  };

  const removeParticipant = (participantId) => {
    if (!projectPermissions.manageAccess || !activeProject) {
      return;
    }
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id !== activeProject.id
          ?project
          : {
              ...project,
              participants: project.participants.filter(
                (participant) => participant.id !== participantId || participant.name === demoWorkspace.user.name
              ),
            }
      )
    );
  };

  return (
    <div className={`app-shell workspace-shell ${isSidebarOpen ?'is-sidebar-open' : ''}`}>
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
        <section className="content-grid">
          {activeSection === 'overview' && <OverviewSection project={activeProject ?? projects[0]} />}
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
              onDeleteTask={deleteTask}
              onInvite={() => setIsInviteModalOpen(true)}
              onMoveProject={moveProject}
              onOpenProject={openProject}
              onOpenSectionModal={() => setIsSectionModalOpen(true)}
              onOpenTaskModal={() => setIsTaskModalOpen(true)}
              onOpenAccessModal={() => setIsAccessModalOpen(true)}
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
          {activeSection === 'tasks' && <TasksSection project={activeProject ?? projects[0]} projects={projects} />}
          {activeSection === 'messages' && (
            <MessagesSection
              project={activeProject ?? projects[0]}
              preferredConversationId={preferredConversationId}
            />
          )}
          {activeSection === 'friends' && (
            <FriendsSection
              currentUserStatus={currentUserProfile.status}
              onChangeCurrentUserStatus={(status) => setCurrentUserProfile((current) => ({ ...current, status }))}
              onOpenPrivateDiscussion={openPrivateDiscussionWithFriend}
            />
          )}
          {activeSection === 'profile' && (
            <ProfileSection
              profileForm={currentUserProfile}
              onChangeProfile={setCurrentUserProfile}
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
                <span className="pill pill-electric">Étape {createStep}/4</span>
              </div>

              {createStep === 1 && (
                <div className="form-grid">
                  <label className="field field-full">
                    <span>Nom du chantier</span>
                    <input
                      type="text"
                      placeholder="Ex. Rénovation maison Lambert"
                      value={newProject.name}
                      onChange={(event) => setNewProject((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>
                </div>
              )}

              {createStep === 2 && (
                <div className="wizard-step-stack">
                  <div className="form-grid">
                    <label className="field">
                      <span>Nom</span>
                      <input
                        type="text"
                        value={newProjectParticipant.name}
                        onChange={(event) =>
                          setNewProjectParticipant((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Email</span>
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
                      <input
                        type="text"
                        value={newProjectParticipant.company}
                        onChange={(event) =>
                          setNewProjectParticipant((current) => ({ ...current, company: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Rôle</span>
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
                      Ajouter l'intervenant
                    </button>
                  </div>

                  <div className="summary-card participant-summary-list">
                    {projectParticipants.map((participant) => (
                      <div key={participant.id} className="summary-row participant-summary-row">
                        <div className="participant-summary-copy">
                          <strong>{participant.name}</strong>
                          <span>
                            {participant.role}
                            {participant.company ? ` • ${participant.company}` : ''}
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
                    <span>Client</span>
                    <input
                      type="text"
                      value={newProject.client}
                      onChange={(event) => setNewProject((current) => ({ ...current, client: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Ville / site</span>
                    <input
                      type="text"
                      value={newProject.site}
                      onChange={(event) => setNewProject((current) => ({ ...current, site: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Budget</span>
                    <input
                      type="text"
                      value={newProject.budget}
                      onChange={(event) => setNewProject((current) => ({ ...current, budget: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Date de début</span>
                    <input
                      type="date"
                      value={newProject.startDate}
                      onChange={(event) => setNewProject((current) => ({ ...current, startDate: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Date de fin</span>
                    <input
                      type="date"
                      value={newProject.endDate}
                      onChange={(event) => setNewProject((current) => ({ ...current, endDate: event.target.value }))}
                    />
                  </label>
                  <label className="field field-full">
                    <span>Sections du chantier</span>
                    <input
                      type="text"
                      placeholder="Ex. Gros œuvre, Cuisine, Façade"
                      value={newProject.sectionsInput}
                      onChange={(event) =>
                        setNewProject((current) => ({ ...current, sectionsInput: event.target.value }))
                      }
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
                    <strong>{newProject.client || 'À préciser'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Site</span>
                    <strong>{newProject.site || '-'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Budget</span>
                    <strong>{newProject.budget || 'À définir'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Période</span>
                    <strong>
                      {newProject.startDate || '-'} -> {newProject.endDate || '-'}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Sections</span>
                    <strong>{newProject.sectionsInput || 'Général chantier'}</strong>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => (createStep === 1 ?setIsCreateModalOpen(false) : setCreateStep((step) => step - 1))}
                >
                  {createStep === 1 ? 'Annuler' : 'Précédent'}
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
                    {editingProjectId ? 'Enregistrer le chantier' : 'Créer le chantier'}
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
                  <span>Rôle</span>
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
            onRemoveParticipant={removeParticipant}
            onUpdateParticipantRole={updateParticipantRole}
            participants={activeProject.participants}
          />
        )}

        {isSectionModalOpen && activeProject && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-card light-modal">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Nouvelle tâche</p>
                  <h3>Ajouter une tâche</h3>
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
                  <p className="eyebrow">Nouvelle tâche</p>
                  <h3>Ajouter une tâche</h3>
                </div>
                <span className="pill pill-electric">Étape {taskStep}/4</span>
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
                      <option value="Décision">Décision</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Priorité</span>
                    <select
                      value={newTask.priority}
                      onChange={(event) => setNewTask((current) => ({ ...current, priority: event.target.value }))}
                    >
                      <option value="Basse">Basse</option>
                      <option value="Moyenne">Moyenne</option>
                      <option value="Haute">Haute</option>
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
                        className={`assignee-chip ${newTask.assignees.includes(participant.name) ?'is-active' : ''}`}
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
                  {taskStep === 1 ? 'Annuler' : 'Précédent'}
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

function OverviewSection({ project }) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  return (
    <>
      <section className="panel light-panel compact-panel">
        <div className="panel-heading compact dense-heading">
          <div>
            <h3>{project.name}</h3>
            <p className="topbar-subcopy">{project.client} {'\u00b7'} {project.site} {'\u00b7'} {project.period}</p>
          </div>
          <div className="hero-inline-metrics">
            <span className="pill">{project.progress}%</span>
            <span className="pill">{project.budget}</span>
          </div>
        </div>
        <div className="overview-rail">
          <div className="overview-column">
            <button type="button" className="action-button compact quickview-button" onClick={() => setIsQuickViewOpen(true)}>
              <FontAwesomeIcon icon={faLayerGroup} />
              Vue rapide
            </button>
          </div>
        </div>
      </section>
      {isQuickViewOpen && (
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
              {demoWorkspace.stats.map((stat, index) => (
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
        {demoWorkspace.stats.map((stat, index) => (
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
  if (!activeProject) {
    return (
      <section className="panel light-panel">
        <div className="panel-heading">
          <div>
            <h3>Sélectionne un chantier</h3>
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
          onEditProject={onEditProject}
          projects={projects}
          onMoveProject={onMoveProject}
          onOpenProject={onOpenProject}
        />
      </section>
    );
  }

  return (
    <section className="panel light-panel chantier-panel chantier-panel-full project-detail-screen">
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
              <h3>{activeProject.name}</h3>
            </div>
          </div>
          <div className="chantier-topbar-actions">
            {canManageProject && (
              <>
                <button type="button" className="secondary-button compact success-button" onClick={onOpenAccessModal}>
                  Gérer les accès
                </button>
              </>
            )}
            {permissions.inviteParticipant && (
              <>
                <button type="button" className="action-button compact" onClick={onInvite}>
                  <FontAwesomeIcon icon={faUserPlus} />
                  Inviter
                </button>
              </>
            )}
            <button type="button" className="secondary-button icon-only">i</button>
          </div>
        </div>

        <div className="tab-strip chantier-strip chantier-strip-top">
          {chantierTabs
            .filter((tab) => availableTabs.includes(tab.id))
            .map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`tab-button ${activeProjectTab === tab.id ? 'is-active' : ''}`}
                onClick={() => onSelectTab(tab.id)}
              >
                <FontAwesomeIcon icon={tab.icon} />
                <span>{tab.label}</span>
              </button>
            ))}
        </div>

        <div className="project-actions-row project-meta-row">
          <span className="project-location">
            <FontAwesomeIcon icon={faLocationDot} />
            {activeProject.site}
          </span>
          <span className="project-client-line">{activeProject.client}</span>
          <span className="project-client-line">{activeProject.period}</span>
          <span className="project-client-line">Rôle : {getNormalizedRole(currentParticipant?.role) || '-'}</span>
        </div>

        <div className="project-module-stage">
          {activeProjectTab === 'Administratif' && (
            <AdminDocsTab canAddAdminDoc={permissions.addAdminDoc} onSaveAdminDoc={onSaveAdminDoc} project={activeProject} />
          )}
          {activeProjectTab === 'Documents' && (
            <DocumentsTab canAddDocument={permissions.addDocument} onSaveDocument={onSaveDocument} project={activeProject} />
          )}
          {activeProjectTab === 'Plan' && (
            <PlansTab canAddPlan={permissions.addPlan} onSavePlan={onSavePlan} project={activeProject} />
          )}
          {activeProjectTab === 'Taches' && (
            <CompactProjectTasksTab
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
                  priority: 'Moyenne',
                });
                onOpenTaskModal();
              }}
              onSetTaskStatus={onToggleTaskCompleted}
              onToggleSection={onToggleSection}
              openSections={openSections}
            />
          )}
          {activeProjectTab === 'Acteurs' && <CompactActorsTab project={activeProject} />}
        </div>
      </section>
  );
}

function ProjectList({ projects, onMoveProject, onOpenProject, onEditProject, activeProjectId }) {
  return (
    <>
      <div className="project-list project-list-rows view-mode-list">
        {projects.map((project, index) => (
          <article key={project.id} className={`project-list-card ${activeProjectId === project.id ?'is-active' : ''}`}>
            <button type="button" className="project-list-main" onClick={() => onOpenProject(project.id)}>
              <div className="project-row-main">
                <div className="project-row-head">
                  <strong>{project.name}</strong>
                  <div className="project-row-head-right">
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
    </>
  );
}


function AdminDocsTab({ project, canAddAdminDoc, onSaveAdminDoc }) {
  const [editingDoc, setEditingDoc] = useState(null);
  const [docStep, setDocStep] = useState(1);
  const [selectedType, setSelectedType] = useState('Offres');
  const [openAdminDocId, setOpenAdminDocId] = useState(null);
  const [openAdminGroups, setOpenAdminGroups] = useState({});

  const openAdminEditor = (doc) => {
    setEditingDoc({ ...doc });
    setDocStep(1);
  };

  const filteredDocs = project.adminDocs.filter((doc) => doc.type === selectedType);
  const groups = [
    {
      label: selectedType + ' en cours',
      items: filteredDocs.filter((doc) => ['En attente', 'En cours', 'Brouillon', '\u00c0 v\u00e9rifier', 'En r\u00e9vision'].includes(doc.status)),
    },
    {
      label: selectedType + ' valid\u00e9s',
      items: filteredDocs.filter((doc) => ['Valid\u00e9e', 'Sign\u00e9', 'Active', 'Publi\u00e9'].includes(doc.status)),
    },
    {
      label: selectedType + ' archiv\u00e9s',
      items: filteredDocs.filter((doc) => ['Archiv\u00e9', 'Refus\u00e9e', 'Refusee', 'Expir\u00e9e'].includes(doc.status)),
    },
  ];

  return (
    <div className="admin-module">
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
          {openAdminGroups[group.label] ? (
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
                Ajouter
              </button>
            )}
          </div>
          <div className="admin-doc-list view-mode-list">
            {group.items.length ? (
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
                      <span className="pill pill-electric">{doc.status}</span>
                    </div>
                  </button>
                  {openAdminDocId === doc.id ? (
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
                    </div>
                  </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="summary-card">
                <div className="summary-row">
                  <span>{'Aucun \u00e9l\u00e9ment dans ' + group.label.toLowerCase()}</span>
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
              <span className="pill pill-electric">{'\u00c9tape ' + docStep + '/4'}</span>
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
                  <input type="text" value={editingDoc.status} onChange={(event) => setEditingDoc((current) => ({ ...current, status: event.target.value }))} />
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
                    <span>Fichier s\u00e9lectionn\u00e9</span>
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
                {docStep === 1 ? 'Annuler' : 'Pr\u00e9c\u00e9dent'}
              </button>
              {docStep < 4 ? (
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


function DocumentsTab({ project, canAddDocument, onSaveDocument }) {
  const [editingDocument, setEditingDocument] = useState(null);
  const [documentStep, setDocumentStep] = useState(1);
  const [openDocumentId, setOpenDocumentId] = useState(null);
  const documentSections = [
    { id: 'Plans', label: 'Plans', tabLabel: 'Plans', aliases: ['Plans'] },
    { id: 'Technique', label: 'Technique', tabLabel: 'Tech.', aliases: ['Technique', 'Techniques'] },
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
    docs: section.aliases.flatMap((alias) => categoriesMap.get(alias) ?? []),
  }));
  const selectedSection = visibleSections.find((section) => section.id === activeDocumentSection) ?? visibleSections[0];
  const isPhotoSection = selectedSection?.id === 'Photo';

  const openDocumentEditor = (doc) => {
    setEditingDocument({ ...doc });
    setDocumentStep(1);
  };

  useEffect(() => {
    if (isPhotoSection) {
      setOpenDocumentId(null);
      return;
    }

    const sectionDocs = selectedSection?.docs ?? [];
    setOpenDocumentId((current) => (
      sectionDocs.some((doc) => doc.id === current) ? current : (sectionDocs[0]?.id ?? null)
    ));
  }, [isPhotoSection, selectedSection]);

  return (
    <div className="documents-module">
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
          {canAddDocument ? (
            <button
              type="button"
              className="action-button compact documents-add-button"
              onClick={() => openDocumentEditor({
                ...initialDocumentForm,
                category: selectedSection?.aliases[0] ?? selectedSection?.label ?? '',
              })}
            >
              <FontAwesomeIcon icon={faPlus} />
              Ajouter
            </button>
          ) : null}
        </div>
        <div className={`documents-panel ${isPhotoSection ? 'is-photo-panel' : 'is-file-panel'}`}>
          {isPhotoSection ? (
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
                  </button>
                  <div className="photo-card-body">
                    <strong>{doc.name}</strong>
                    <div className="photo-card-meta">
                      <span>{doc.version}</span>
                      <span className="pill pill-electric">{doc.status}</span>
                    </div>
                    {openDocumentId === doc.id ? (
                      <div className="photo-card-details">
                        <div className="details-row">
                          <span>Cat\u00e9gorie</span>
                          <strong>{doc.category}</strong>
                        </div>
                        <div className="details-row">
                          <span>Sous-cat\u00e9gorie</span>
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
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
              {(selectedSection?.docs ?? []).length === 0 ? (
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
                      {doc.subcategory && doc.subcategory !== doc.name ? <small>{doc.subcategory}</small> : null}
                    </div>
                    <div className="document-summary-meta">
                      <span>{doc.version}</span>
                      <span className="pill pill-electric">{doc.status}</span>
                    </div>
                  </button>
                  {openDocumentId === doc.id ? (
                  <div className="document-details">
                    <div className="details-row">
                      <span>Cat\u00e9gorie</span>
                      <strong>{doc.category}</strong>
                    </div>
                    <div className="details-row">
                      <span>Sous-cat\u00e9gorie</span>
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
                    </div>
                  </div>
                  ) : null}
                </article>
              ))}
              {(selectedSection?.docs ?? []).length === 0 ? (
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
              <span className="pill pill-electric">{'\u00c9tape ' + documentStep + '/4'}</span>
            </div>
            {documentStep === 1 && (
              <div className="form-grid">
                <label className="field">
                  <span>Cat\u00e9gorie</span>
                  <input type="text" value={editingDocument.category} onChange={(event) => setEditingDocument((current) => ({ ...current, category: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Sous-cat\u00e9gorie</span>
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
                    <span>Fichier s\u00e9lectionn\u00e9</span>
                    <strong>{editingDocument.fileName || '-'}</strong>
                  </div>
                </div>
              </div>
            )}
            {documentStep === 4 && (
              <div className="summary-card">
                <div className="summary-row">
                  <span>Cat\u00e9gorie</span>
                  <strong>{editingDocument.category || '-'}</strong>
                </div>
                <div className="summary-row">
                  <span>Sous-cat\u00e9gorie</span>
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
                {documentStep === 1 ? 'Annuler' : 'Pr\u00e9c\u00e9dent'}
              </button>
              {documentStep < 4 ? (
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
      const minWidth = isMobileViewport ? 280 : 640;
      const safeWidth = Math.max(minWidth, nextWidth - 2);
      const imageRatio = image && image.width && image.height ? image.width / image.height : 16 / 9;
      const maxHeight = isMobileViewport
        ? Math.max(260, window.innerHeight - 290)
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


function PlansTab({ project, canAddPlan, onSavePlan }) {
  const [openPlanId, setOpenPlanId] = useState(null);
  const [selectedPlanVersions, setSelectedPlanVersions] = useState({});
  const [studioPlan, setStudioPlan] = useState(null);
  const [isMobileStudio, setIsMobileStudio] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 767 : false));
  const [planTool, setPlanTool] = useState(planToolPresets[0].id);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [annotationHistory, setAnnotationHistory] = useState([]);
  const [annotationFuture, setAnnotationFuture] = useState([]);
  const activeToolPreset = planToolPresets.find((item) => item.id === planTool) ?? planToolPresets[0];

  const cloneAnnotations = (annotations) => (
    (annotations ?? []).map((annotation) => ({
      ...annotation,
      points: Array.isArray(annotation.points) ? [...annotation.points] : annotation.points,
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
    const storedVersions = Array.isArray(plan.versions) ? plan.versions : [];
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
    return String((numericLabels.length ? Math.max(...numericLabels) : 0) + 1);
  };

  const openPlanStudio = (plan) => {
    setStudioPlan({
      ...plan,
      updatedAt: plan.updatedAt || new Date().toISOString().slice(0, 10),
      imageUrl: plan.imageUrl ?? '',
      annotations: cloneAnnotations(plan.annotations),
      versions: Array.isArray(plan.versions) ? plan.versions.map((version) => ({ ...version })) : [],
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
      ? existingPlan.versions.filter((version) => version.version !== snapshotPlan.version)
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

  useEffect(() => {
    setOpenPlanId((current) => (project.plans.some((plan) => plan.id === current) ? current : (project.plans[0]?.id ?? null)));
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

        {annotation.type === 'marker' ? (
          <label className="field">
            <span>Numero</span>
            <input
              type="text"
              value={annotation.label ?? ''}
              onChange={(event) => updatePlanAnnotation(annotation.id, { label: event.target.value })}
            />
          </label>
        ) : null}

        {annotation.type === 'text' ? (
          <label className="field">
            <span>Texte</span>
            <input
              type="text"
              value={annotation.text ?? ''}
              onChange={(event) => updatePlanAnnotation(annotation.id, { text: event.target.value })}
            />
          </label>
        ) : null}

        {annotation.type === 'circle' ? (
          <label className="field">
            <span>Rayon</span>
            <input
              type="number"
              value={annotation.radius ?? 46}
              onChange={(event) => updatePlanAnnotation(annotation.id, { radius: Number(event.target.value || 0) })}
            />
          </label>
        ) : null}

        {annotation.type === 'rect' ? (
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
      <div className="plan-toolbar">
        {canAddPlan ? (
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
        {project.plans.length === 0 ? (
          <div className="documents-empty-state">
            <strong>Aucun plan</strong>
            <span>Ajoute un plan pour commencer l'annotation.</span>
          </div>
        ) : null}

        {project.plans.map((plan) => {
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
                </div>
              </button>

              {openPlanId === plan.id ? (
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
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {studioPlan ? (
        <div className="modal-backdrop plan-studio-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal plan-studio-modal">
            {isMobileStudio ? (
              <div className="plan-studio-mobile">
                <div className="plan-mobile-topbar">
                  <button type="button" className="secondary-button compact" onClick={closePlanStudio}>
                    Fermer
                  </button>
                  <div className="plan-mobile-topbar-copy">
                    <strong>{studioPlan.name || 'Plan'}</strong>
                    <span>{`v${studioPlan.version} ? ${studioPlan.annotations?.length ?? 0} reperes`}</span>
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

                  {selectedAnnotation ? (
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

                  {selectedAnnotation ? (
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
              Ajouter une tâche
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
            <span>{openSections[section] ?'-' : '+'}</span>
          </button>
          {openSections[section] && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N°</th>
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
                        <td>{task.assignees?.join(', ') || 'Non assigné'}</td>
                        <td>{task.interventionType || '-'}</td>
                        <td>{task.dueDate || '-'}</td>
                        <td>{getTaskStatus(task)}</td>
                        <td className="task-actions-cell">
                          {getTaskStatus(task) !== 'À faire' && (
                            <button
                              type="button"
                              className="secondary-button compact"
                              onClick={() => onSetTaskStatus(task.id, 'À faire')}
                            >
                              À faire
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
                          {getTaskStatus(task) !== 'Terminée' && (
                            <button
                              type="button"
                              className="secondary-button compact"
                              onClick={() => onSetTaskStatus(task.id, 'Terminée')}
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
      name: 'Discussion générale',
      participantsLabel: `${project.participants.length} intervenants`,
      preview: 'Canal commun pour tout le chantier.',
      messages: [
        { id: 'general-1', author: 'Coordination', text: 'Bonjour a tous, point chantier a 8h30 demain.', time: '08:12', own: false },
        { id: 'general-2', author: 'Vous', text: 'Bien reçu, je serai présent.', time: '08:18', own: true, status: 'Lu' },
        { id: 'general-3', author: 'Architecte', text: 'Je partage aussi les derniers ajustements avant la reunion.', time: '08:24', own: false },
      ],
    };

    const privateConversations = project.participants.filter((participant) => participant.name !== demoWorkspace.user.name).map((participant, index) => ({
      id: `actor-${participant.id}`,
      name: participant.name,
      participantsLabel: `Prive • ${getNormalizedRole(participant.role)}`,
      preview: `Discussion privée avec ${participant.name}`,
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
      ? `${lastMessage.attachment.kind === 'image' ? 'Photo' : 'Pièce jointe'} : ${lastMessage.attachment.name}`
      : (lastMessage?.text ?? conversation.preview);

    return {
      ...conversation,
      preview,
      lastTime: lastMessage?.time ?? '08:42',
    };
  });

  const selectedConversation = actorConversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const thread = selectedConversation ? (messagesByConversation[selectedConversation.id] ?? []) : [];

  const sendMessage = () => {
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
          status: 'Envoyé',
          attachment: null,
        },
      ],
    }));
    setMessageDraft('');
  };

  const addAttachmentToConversation = (file, kind) => {
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
          text: kind === 'image' ? `Photo envoyée : ${attachment.name}` : `Pièce jointe : ${attachment.name}`,
          time,
          own: true,
          status: 'Envoyé',
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
      {!selectedConversation ? (
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
                <span className="pill pill-electric">{conversation.id === 'general-site' ? 'groupe' : 'privé'}</span>
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
                {!item.own ? <strong>{item.author}</strong> : null}
                {item.attachment?.kind === 'image' ? (
                  <a href={item.attachment.url} target="_blank" rel="noreferrer" className="chat-attachment-preview">
                    <img src={item.attachment.url} alt={item.attachment.name} className="chat-image-preview" />
                  </a>
                ) : null}
                <p>{item.text}</p>
                {item.attachment?.kind === 'file' ? (
                  <a href={item.attachment.url} target="_blank" rel="noreferrer" className="chat-attachment-link">
                    <FontAwesomeIcon icon={faFile} />
                    <span>{item.attachment.name}</span>
                  </a>
                ) : null}
                <small>{item.time}{item.own && item.status ? ` • ${item.status}` : ''}</small>
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
          <button type="button" className="icon-button" onClick={() => galleryInputRef.current?.click()} aria-label="Ajouter une pièce jointe">
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
            placeholder="Écrire un message"
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
  canCreateSection,
  canCreateTask,
  canDeleteTask,
  canUpdateTask,
  onUpdateTask,
  project,
  onDeleteTask,
  onOpenSectionModal,
  onOpenTaskModal,
  onSetTaskStatus,
  onToggleSection,
  openSections,
}) {
  const [openTaskId, setOpenTaskId] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  return (
    <div className="task-module">
      <div className="task-toolbar">
        <div className="task-toolbar-actions">
          {canCreateTask && typeof onOpenTaskModal === 'function' && (
            <button type="button" className="action-button" onClick={onOpenTaskModal}>
              <FontAwesomeIcon icon={faPlus} />
              Ajouter une tâche
            </button>
          )}
          {canCreateSection && typeof onOpenSectionModal === 'function' && (
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
            <div className="project-task-board">
              {taskStatusOptions.map((status) => {
                const columnTasks = project.tasks.filter(
                  (task) => task.section === section && getTaskStatus(task) === status.id
                );

                return (
                  <div
                    key={status.id}
                    className="project-task-column"
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
                    <div className="project-task-column-header">
                      <strong>{status.label}</strong>
                      <span className="pill">{columnTasks.length}</span>
                    </div>

                    <div className="task-list project-task-column-list">
                      {columnTasks.length ? (
                        columnTasks.map((task) => {
                          const isOpen = openTaskId === task.id;
                          return (
                            <article
                              key={task.id}
                              className={`task-item ${isOpen ? 'is-open' : ''}`}
                              draggable={canUpdateTask}
                              onDragStart={() => setDraggedTaskId(task.id)}
                              onDragEnd={() => setDraggedTaskId(null)}
                              onTouchStart={() => canUpdateTask && setDraggedTaskId(task.id)}
                            >
                              <button
                                type="button"
                                className="task-summary"
                                onClick={() => setOpenTaskId((current) => (current === task.id ? null : task.id))}
                              >
                                <div className="task-summary-main">
                                  <strong>{task.title}</strong>
                                  <small>{task.assignees?.join(', ') || 'Non assigné'}</small>
                                </div>
                                <div className="task-summary-meta">
                                  <span className="pill pill-electric">{getTaskStatus(task)}</span>
                                </div>
                              </button>
                              {isOpen && (
                                <div className="task-details">
                                  <div className="details-row">
                                    <span>Description</span>
                                    <strong>{task.description || '-'}</strong>
                                  </div>
                                  <div className="details-row">
                                    <span>Responsables</span>
                                    <strong>{task.assignees?.join(', ') || 'Non assigné'}</strong>
                                  </div>
                                  <div className="details-row">
                                    <span>Priorité</span>
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
                                  {(canUpdateTask || canDeleteTask) && (
                                    <div className="admin-doc-actions">
                                      {canUpdateTask && (
                                        <>
                                          {getTaskStatus(task) !== 'À faire' && (
                                            <button
                                              type="button"
                                              className="secondary-button compact"
                                              onClick={() => onSetTaskStatus(task.id, 'À faire')}
                                            >
                                              <FontAwesomeIcon icon={faArrowLeft} />
                                              {'À faire'}
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
                                          {getTaskStatus(task) !== 'Terminée' && (
                                            <button
                                              type="button"
                                              className="secondary-button compact"
                                              onClick={() => onSetTaskStatus(task.id, 'Terminée')}
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
                            <span>Aucune tâche</span>
                            <strong>-</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {editingTask && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal">
            <div className="panel-heading compact">
              <div>
                <h3>Modifier une tâche</h3>
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
                <span>Priorité</span>
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
                onClick={() => {
                  onUpdateTask(editingTask.id, editingTask);
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

function TasksSection({ project, projects }) {
  const [taskScope, setTaskScope] = useState('personnel');
  const [personalTasks, setPersonalTasks] = useState(demoWorkspace.personalTasks);
  const [draggedPersonalTaskId, setDraggedPersonalTaskId] = useState(null);
  const [draggedProjectTaskId, setDraggedProjectTaskId] = useState(null);
  const [openPersonalTaskId, setOpenPersonalTaskId] = useState(null);
  const [openProjectTaskId, setOpenProjectTaskId] = useState(null);
  const [projectTaskMap, setProjectTaskMap] = useState(
    Object.fromEntries(projects.map((item) => [item.id, item.tasks]))
  );
  const [openProjects, setOpenProjects] = useState(
    Object.fromEntries(projects.map((item) => [item.id, item.id === (project?.id ?? projects[0]?.id)]))
  );
  const [openProjectSections, setOpenProjectSections] = useState(
    Object.fromEntries(projects.flatMap((item) => (item.sections ?? []).map((section) => [
      `${item.id}:${section}`,
      true,
    ])))
  );
  const [isPersonalTaskModalOpen, setIsPersonalTaskModalOpen] = useState(false);
  const [newPersonalTask, setNewPersonalTask] = useState({
    title: '',
    dueDate: '',
    priority: 'Moyenne',
    source: '',
  });

  useEffect(() => {
    setProjectTaskMap(Object.fromEntries(projects.map((item) => [item.id, item.tasks])));
    setOpenProjects(Object.fromEntries(projects.map((item) => [item.id, item.id === (project?.id ?? projects[0]?.id)])));
    setOpenProjectSections(
      Object.fromEntries(projects.flatMap((item) => (item.sections ?? []).map((section) => [
        `${item.id}:${section}`,
        true,
      ])))
    );
  }, [project, projects]);

  const savePersonalTask = () => {
    if (!newPersonalTask.title.trim()) {
      return;
    }

    setPersonalTasks((current) => [
      {
        id: `personal-task-${Date.now()}`,
        title: newPersonalTask.title.trim(),
        dueDate: newPersonalTask.dueDate || new Date().toISOString().slice(0, 10),
        priority: newPersonalTask.priority,
        source: newPersonalTask.source.trim() || 'Personnel',
        description: newPersonalTask.source.trim() || '',
        status: 'À faire',
      },
      ...current,
    ]);
    setNewPersonalTask({ title: '', dueDate: '', priority: 'Moyenne', source: '' });
    setIsPersonalTaskModalOpen(false);
  };

  const togglePersonalTask = (taskId) => {
    setPersonalTasks((current) =>
      current.map((task) =>
        task.id !== taskId
          ? task
          : updateTaskStatus(task, getTaskStatus(task) === 'Terminée' ? 'À faire' : 'Terminée')
      )
    );
  };

  const movePersonalTask = (taskId, nextStatus) => {
    setPersonalTasks((current) =>
      current.map((task) => (task.id !== taskId ? task : updateTaskStatus(task, nextStatus)))
    );
  };

  const setProjectTaskStatus = (projectId, taskId, status) => {
    setProjectTaskMap((current) => ({
      ...current,
      [projectId]: (current[projectId] ?? []).map((task) =>
        task.id !== taskId ? task : updateTaskStatus(task, status)
      ),
    }));
  };

  const deleteProjectTask = (projectId, taskId) => {
    setProjectTaskMap((current) => ({
      ...current,
      [projectId]: (current[projectId] ?? []).filter((task) => task.id !== taskId),
    }));
  };

  return (
    <section className="panel light-panel compact-screen">
      <div className="panel-heading compact dense-heading">
        <div>
          <h3>{'Tâches'}</h3>
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
                <h3>{'Mes tâches'}</h3>
              </div>
              <div className="header-actions">
                <span className="pill pill-electric">
                  {personalTasks.filter((task) => getTaskStatus(task) !== 'Terminée').length} actives
                </span>
                <button type="button" className="action-button compact" onClick={() => setIsPersonalTaskModalOpen(true)}>
                  <FontAwesomeIcon icon={faPlus} />
                  Ajouter
                </button>
              </div>
            </div>

            <div className="personal-board">
              {taskStatusOptions.map((column) => (
                <div
                  key={column.id}
                  className="personal-board-column"
                  onDragOver={(event) => event.preventDefault()}
                  onTouchEnd={() => {
                    if (draggedPersonalTaskId) {
                      movePersonalTask(draggedPersonalTaskId, column.id);
                      setDraggedPersonalTaskId(null);
                    }
                  }}
                  onDrop={() => {
                    if (draggedPersonalTaskId) {
                      movePersonalTask(draggedPersonalTaskId, column.id);
                      setDraggedPersonalTaskId(null);
                    }
                  }}
                >
                  <div className="personal-board-header">
                    <strong>{column.label}</strong>
                    <span className="pill">{personalTasks.filter((task) => getTaskStatus(task) === column.id).length}</span>
                  </div>

                  <div className="personal-board-list">
                    {personalTasks
                      .filter((task) => getTaskStatus(task) === column.id)
                      .map((task) => (
                        <article
                          key={task.id}
                          className={`task-item ${openPersonalTaskId === task.id ? 'is-open' : ''}`}
                          draggable
                          onDragStart={() => setDraggedPersonalTaskId(task.id)}
                          onDragEnd={() => setDraggedPersonalTaskId(null)}
                          onTouchStart={() => setDraggedPersonalTaskId(task.id)}
                        >
                          <button
                            type="button"
                            className="task-summary"
                            onClick={() => setOpenPersonalTaskId((current) => (current === task.id ? null : task.id))}
                          >
                            <div className="task-summary-main">
                              <strong>{task.title}</strong>
                              <small>{task.source} • {task.dueDate} • {task.priority}</small>
                            </div>
                            <div className="task-summary-meta">
                              <span className="pill pill-electric">{getTaskStatus(task)}</span>
                            </div>
                          </button>
                          {openPersonalTaskId === task.id && (
                            <div className="task-details">
                              <div className="details-row">
                                <span>Description</span>
                                <strong>{task.description || task.source || '-'}</strong>
                              </div>
                              <div className="inline-actions">
                                <button type="button" className="secondary-button compact" onClick={() => togglePersonalTask(task.id)}>
                                  {getTaskStatus(task) === 'Terminée' ? 'Réouvrir' : 'Terminer'}
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button compact"
                                  onClick={() => setPersonalTasks((current) => current.filter((item) => item.id !== task.id))}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {taskScope === 'projet' && (
        <div className="tasks-dashboard single-column">
          {projects.map((projectItem) => {
            const tasks = projectTaskMap[projectItem.id] ?? [];

            return (
              <article key={projectItem.id} className="light-card tasks-dashboard-card project-task-card">
                <button
                  type="button"
                  className="section-header tasks-dashboard-header"
                  onClick={() => setOpenProjects((current) => ({ ...current, [projectItem.id]: !current[projectItem.id] }))}
                >
                  <span>
                    {projectItem.name}
                    <small>{projectItem.site} • {tasks.length} {'tâche(s)'}</small>
                  </span>
                  <span>{openProjects[projectItem.id] ? '-' : '+'}</span>
                </button>

                {openProjects[projectItem.id] && (
                  <div className="stack-list compact-stack-list view-mode-list">
                    {tasks.length ? (
                      (projectItem.sections ?? []).map((section) => {
                        const sectionKey = `${projectItem.id}:${section}`;
                        const sectionTasks = tasks.filter((task) => task.section === section);

                        return (
                          <div key={sectionKey} className="section-block compact-project-section">
                            <button
                              type="button"
                              className="section-header"
                              onClick={() =>
                                setOpenProjectSections((current) => ({
                                  ...current,
                                  [sectionKey]: !current[sectionKey],
                                }))
                              }
                            >
                              <span>{section}</span>
                              <span>{openProjectSections[sectionKey] ? '-' : '+'}</span>
                            </button>

                            {openProjectSections[sectionKey] && (
                              <div className="project-task-board">
                                {taskStatusOptions.map((status) => {
                                  const columnTasks = sectionTasks.filter((task) => getTaskStatus(task) === status.id);

                                  return (
                                    <div
                                      key={`${sectionKey}:${status.id}`}
                                      className="project-task-column"
                                      onDragOver={(event) => event.preventDefault()}
                                      onDrop={() => {
                                        if (draggedProjectTaskId) {
                                          setProjectTaskStatus(projectItem.id, draggedProjectTaskId, status.id);
                                          setDraggedProjectTaskId(null);
                                        }
                                      }}
                                      onTouchEnd={() => {
                                        if (draggedProjectTaskId) {
                                          setProjectTaskStatus(projectItem.id, draggedProjectTaskId, status.id);
                                          setDraggedProjectTaskId(null);
                                        }
                                      }}
                                    >
                                      <div className="project-task-column-header">
                                        <strong>{status.label}</strong>
                                        <span className="pill">{columnTasks.length}</span>
                                      </div>

                                      <div className="task-list project-task-column-list">
                                        {columnTasks.length ? (
                                          columnTasks.map((task) => (
                                            <article
                                              key={task.id}
                                              className={`task-item ${openProjectTaskId === task.id ? 'is-open' : ''}`}
                                              draggable
                                              onDragStart={() => setDraggedProjectTaskId(task.id)}
                                              onDragEnd={() => setDraggedProjectTaskId(null)}
                                              onTouchStart={() => setDraggedProjectTaskId(task.id)}
                                            >
                                              <button
                                                type="button"
                                                className="task-summary"
                                                onClick={() => setOpenProjectTaskId((current) => (current === task.id ? null : task.id))}
                                              >
                                                <div className="task-summary-main">
                                                  <strong>{task.title}</strong>
                                                  <small>
                                                    {task.assignees?.join(', ') || 'Non assigné'}
                                                  </small>
                                                </div>
                                                <div className="task-summary-meta">
                                                  <span className="pill pill-electric">{task.interventionType || '-'}</span>
                                                </div>
                                              </button>
                                              {openProjectTaskId === task.id && (
                                                <div className="task-details">
                                                  <div className="details-row">
                                                    <span>Description</span>
                                                    <strong>{task.description || '-'}</strong>
                                                  </div>
                                                  <div className="details-row">
                                                    <span>Statut</span>
                                                    <strong>{getTaskStatus(task)}</strong>
                                                  </div>
                                                  <div className="inline-actions">
                                                    {getTaskStatus(task) !== '? faire' && (
                                                      <button
                                                        type="button"
                                                        className="secondary-button compact"
                                                        onClick={() => setProjectTaskStatus(projectItem.id, task.id, 'À faire')}
                                                      >
                                                        {'À faire'}
                                                      </button>
                                                    )}
                                                    {getTaskStatus(task) !== 'En cours' && (
                                                      <button
                                                        type="button"
                                                        className="secondary-button compact"
                                                        onClick={() => setProjectTaskStatus(projectItem.id, task.id, 'En cours')}
                                                      >
                                                        En cours
                                                      </button>
                                                    )}
                                                    {getTaskStatus(task) !== 'Termin?e' && (
                                                      <button
                                                        type="button"
                                                        className="secondary-button compact"
                                                        onClick={() => setProjectTaskStatus(projectItem.id, task.id, 'Terminée')}
                                                      >
                                                        Terminer
                                                      </button>
                                                    )}
                                                    <button
                                                      type="button"
                                                      className="secondary-button compact"
                                                      onClick={() => deleteProjectTask(projectItem.id, task.id)}
                                                    >
                                                      Supprimer
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                            </article>
                                          ))
                                        ) : (
                                          <div className="summary-card">
                                            <div className="summary-row">
                                              <span>{'Aucune t?che'}</span>
                                              <strong>-</strong>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="summary-card">
                        <div className="summary-row">
                          <span>{'Aucune t?che'}</span>
                          <strong>-</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                <h3>{'Ajouter une tâche'}</h3>
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
                <span>Échéance</span>
                <input
                  type="date"
                  value={newPersonalTask.dueDate}
                  onChange={(event) => setNewPersonalTask((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Priorité</span>
                <select
                  value={newPersonalTask.priority}
                  onChange={(event) => setNewPersonalTask((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="Basse">Basse</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Haute">Haute</option>
                </select>
              </label>
              <label className="field field-full">
                <span>Origine / dossier</span>
                <input
                  type="text"
                  value={newPersonalTask.source}
                  onChange={(event) => setNewPersonalTask((current) => ({ ...current, source: event.target.value }))}
                  placeholder="Ex. Administratif, Relances, Personnel"
                />
              </label>
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

function MessagesSection({ project, preferredConversationId = null }) {
  const projectConversations = useMemo(() => getProjectActorConversations(project), [project]);
  const createTextMessage = (conversation, idSuffix, author, text, time, own, status = 'Lu') => ({
    id: `${conversation.id}-${idSuffix}`,
    author,
    text,
    time,
    own,
    status,
    attachment: null,
  });

  const createAttachmentMessage = (conversationId, attachment, time) => ({
    id: `${conversationId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: 'Vous',
    text: attachment.kind === 'image' ? `Photo envoyée : ${attachment.name}` : `Pièce jointe : ${attachment.name}`,
    time,
    own: true,
    status: 'Envoyé',
    attachment,
  });

  const buildThread = (conversation) => {
    if (!conversation) {
      return [];
    }

    return [
      createTextMessage(conversation, '1', conversation.name, conversation.preview, '08:42', false),
      createTextMessage(conversation, '2', 'Vous', 'Bien reçu, je vérifie et je vous fais un retour dans la foulée.', '08:48', true),
      createTextMessage(conversation, '3', conversation.name, 'Parfait, merci.', '08:49', false),
    ];
  };

  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attachmentSort, setAttachmentSort] = useState('recent');
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const initialMessagesByConversation = useMemo(
    () => Object.fromEntries(projectConversations.map((conversation) => [
      conversation.id,
      [
        {
          id: `${conversation.id}-1`,
          author: conversation.name,
          text: conversation.preview,
          time: '08:42',
          own: false,
          status: 'Lu',
          attachment: null,
        },
        {
          id: `${conversation.id}-2`,
          author: 'Vous',
          text: 'Bien reçu, je vérifie et je vous fais un retour dans la foulée.',
          time: '08:48',
          own: true,
          status: 'Lu',
          attachment: null,
        },
        {
          id: `${conversation.id}-3`,
          author: conversation.name,
          text: 'Parfait, merci.',
          time: '08:49',
          own: false,
          status: 'Lu',
          attachment: null,
        },
      ],
    ])),
    [projectConversations]
  );
  const [messagesByConversation, setMessagesByConversation] = useState(initialMessagesByConversation);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    setSelectedConversationId(null);
    setAttachmentSort('recent');
    setIsAttachmentsOpen(false);
    setMessagesByConversation(initialMessagesByConversation);
  }, [initialMessagesByConversation]);

  useEffect(() => {
    if (!preferredConversationId) {
      return;
    }

    const preferredConversationExists = projectConversations.some((conversation) => conversation.id === preferredConversationId);
    if (preferredConversationExists) {
      setSelectedConversationId(preferredConversationId);
    }
  }, [preferredConversationId, projectConversations]);

  const conversationRows = projectConversations
    .map((conversation) => {
      const thread = messagesByConversation[conversation.id] ?? buildThread(conversation);
      const lastMessage = thread[thread.length - 1];
      const preview = lastMessage?.attachment
        ? `${lastMessage.attachment.kind === 'image' ? 'Photo' : 'Pièce jointe'} : ${lastMessage.attachment.name}`
        : (lastMessage?.text ?? conversation.preview);

      return {
        ...conversation,
        preview,
        lastTime: lastMessage?.time ?? '08:42',
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
      const [leftHour = '0', leftMinute = '0'] = (left.lastTime ?? '00:00').split(':');
      const [rightHour = '0', rightMinute = '0'] = (right.lastTime ?? '00:00').split(':');
      const leftValue = Number(leftHour) * 60 + Number(leftMinute);
      const rightValue = Number(rightHour) * 60 + Number(rightMinute);
      return rightValue - leftValue;
    });

  const selectedConversation = conversationRows.find((conversation) => conversation.id === selectedConversationId)
    ?? projectConversations.find((conversation) => conversation.id === selectedConversationId)
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
          return left.attachment.kind === 'image' ? -1 : 1;
        }

        if (attachmentSort === 'files') {
          if (left.attachment.kind === right.attachment.kind) {
            return rightValue - leftValue;
          }
          return left.attachment.kind === 'file' ? -1 : 1;
        }

        return rightValue - leftValue;
      })
  ), [attachmentSort, thread]);

  const sendMessage = () => {
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
          status: 'Envoyé',
          attachment: null,
        },
      ],
    }));
    setMessageDraft('');
  };

  const addAttachmentToConversation = (file, kind) => {
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
        createAttachmentMessage(selectedConversation.id, attachment, time),
      ],
    }));
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
      <div className="panel-heading compact dense-heading">
        <div>
          <h3>Messages</h3>
        </div>
        <span className="pill pill-electric">{projectConversations.length} conversations</span>
      </div>
      <div className={`messages-app ${selectedConversation ? 'has-open-thread' : ''}`}>
        {!selectedConversation ? (
          <div className="messages-list-panel">
            <div className="messages-list-top">
              <div>
                <strong>Discussions</strong>
                <small>{project.name}</small>
              </div>
              <span className="pill">{projectConversations.length}</span>
            </div>
            <div className="messages-search">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher une conversation"
              />
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
                    {conversation.unread ? <span className="pill pill-electric">{conversation.unread}</span> : <small>Lu</small>}
                  </span>
                </button>
              ))}
            </div>
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
                  <small>{selectedConversation.participants} participants</small>
                </div>
              </div>
              <div className="thread-actions">
                <button
                  type="button"
                  className="secondary-button compact"
                  onClick={() => setIsAttachmentsOpen((current) => !current)}
                >
                  <FontAwesomeIcon icon={faPaperclip} />
                  Pièces jointes
                </button>
              </div>
            </div>
            {isAttachmentsOpen ? (
              <div className="attachments-panel">
                <div className="attachments-panel-head">
                  <strong>Pièces jointes</strong>
                  <select value={attachmentSort} onChange={(event) => setAttachmentSort(event.target.value)}>
                    <option value="recent">Récentes</option>
                    <option value="oldest">Anciennes</option>
                    <option value="images">Photos d'abord</option>
                    <option value="files">Fichiers d'abord</option>
                  </select>
                </div>
                <div className="attachments-list">
                  {attachments.length > 0 ? (
                    attachments.map((item) => (
                      <a
                        key={item.id}
                        className="attachment-item"
                        href={item.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="attachment-item-icon">
                          <FontAwesomeIcon icon={item.attachment.kind === 'image' ? faImage : faFile} />
                        </span>
                        <span className="attachment-item-main">
                          <strong>{item.attachment.name}</strong>
                          <small>{item.author} • {item.time} • {item.attachment.sizeLabel}</small>
                        </span>
                      </a>
                    ))
                  ) : (
                    <p className="attachments-empty">Aucune pièce jointe dans cette conversation.</p>
                  )}
                </div>
              </div>
            ) : null}
            <div className="messages-thread-body">
              {thread.map((message) => (
                <div key={message.id} className={`chat-row ${message.own ? 'is-own' : ''}`}>
                  <article className={`chat-bubble ${message.own ? 'is-own' : ''}`}>
                    {!message.own ? <strong>{message.author}</strong> : null}
                    {message.attachment?.kind === 'image' ? (
                      <a href={message.attachment.url} target="_blank" rel="noreferrer" className="chat-attachment-preview">
                        <img src={message.attachment.url} alt={message.attachment.name} className="chat-image-preview" />
                      </a>
                    ) : null}
                    <p>{message.text}</p>
                    {message.attachment?.kind === 'file' ? (
                      <a href={message.attachment.url} target="_blank" rel="noreferrer" className="chat-attachment-link">
                        <FontAwesomeIcon icon={faFile} />
                        <span>{message.attachment.name}</span>
                      </a>
                    ) : null}
                    <small>{message.time}{message.own && message.status ? ` • ${message.status}` : ''}</small>
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
              <button type="button" className="icon-button" onClick={() => galleryInputRef.current?.click()} aria-label="Ajouter une pièce jointe">
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
                    sendMessage();
                  }
                }}
                placeholder="Écrire un message"
              />
              <button type="button" className="action-button" onClick={sendMessage}>
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

function FriendsSection({ currentUserStatus, onChangeCurrentUserStatus, onOpenPrivateDiscussion }) {
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [startedChats, setStartedChats] = useState([]);
  const [presenceFilter, setPresenceFilter] = useState('online');

  const getFriendDetails = (friend) => {
    const slug = friend.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
    const tradeMeta = {
      Architecte: {
        company: 'Atelier Signature',
        city: 'Bruxelles',
        skills: ['Plans', 'D\u00e9tails', 'Suivi esth\u00e9tique'],
      },
      Entrepreneur: {
        company: 'Structure & Co',
        city: 'Uccle',
        skills: ['Coordination', 'Planning', 'Ex\u00e9cution'],
      },
      Cliente: {
        company: 'Client priv\u00e9',
        city: 'Watermael-Boitsfort',
        skills: ['Validation', 'D\u00e9cisions', 'Suivi budget'],
      },
    };

    const meta = tradeMeta[friend.trade] ?? {
      company: 'R\u00e9seau Build In Peace',
      city: 'Bruxelles',
      skills: ['Coordination', 'Suivi', '\u00c9changes'],
    };

    return {
      email: `${slug}@buildinpeace.be`,
      phone: '+32 470 11 22 33',
      company: meta.company,
      city: meta.city,
      skills: meta.skills,
      note: friend.status === 'En ligne' ? 'Disponible pour d\u00e9marrer un \u00e9change imm\u00e9diat.' : 'Discussion disponible d\u00e8s ouverture de conversation.',
    };
  };

  const getFriendTone = (friend) => {
    if (friend.status === 'En ligne') {
      return 'online';
    }
    if (friend.status === 'Occup\u00e9') {
      return 'busy';
    }
    return 'offline';
  };

  const openDiscussion = (friend) => {
    setStartedChats((current) => (current.includes(friend.id) ? current : [friend.id, ...current]));
    onOpenPrivateDiscussion?.(friend);
  };

  const orderedFriends = [...demoWorkspace.friends].sort((left, right) => {
    const leftStarted = startedChats.includes(left.id) ? 1 : 0;
    const rightStarted = startedChats.includes(right.id) ? 1 : 0;
    return rightStarted - leftStarted;
  });

  const filteredFriends = orderedFriends.filter((friend) => {
    if (presenceFilter === 'online') return friend.status === 'En ligne';
    if (presenceFilter === 'offline') return friend.status !== 'En ligne';
    return true;
  });

  return (
    <section className="panel light-panel compact-screen friends-screen friends-screen-wide">
      <div className="panel-heading compact dense-heading">
        <div>
          <h3>Amis et partenaires</h3>
        </div>
        <div className="header-actions">
          <span className="pill pill-electric">{filteredFriends.length} contacts</span>
          <button type="button" className="action-button compact" onClick={() => setIsAddFriendOpen(true)}>
            <FontAwesomeIcon icon={faPlus} />
            Ajouter
          </button>
        </div>
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

      {!!startedChats.length && (
        <div className="friend-chat-banner">
          <strong>{startedChats.length} discussion{startedChats.length > 1 ? 's' : ''} pr\u00eate{startedChats.length > 1 ? 's' : ''}</strong>
          <small>Clique sur un contact pour ouvrir ou reprendre une discussion.</small>
        </div>
      )}

      <div className="friends-grid friends-grid-inline">
        {filteredFriends.map((friend) => {
          const details = getFriendDetails(friend);
          const tone = getFriendTone(friend);
          const hasChat = startedChats.includes(friend.id);
          return (
            <article key={friend.id} className={`friend-card friend-card-${tone}`}>
              <button type="button" className="friend-card-main" onClick={() => openDiscussion(friend)}>
                <div className="friend-card-head">
                  <span className="friend-avatar">{friend.name.slice(0, 2).toUpperCase()}</span>
                  <div className="friend-card-copy">
                    <strong>{friend.name}</strong>
                    <small>{friend.trade}</small>
                  </div>
                  <span className={`friend-status friend-status-${tone}`}>{friend.status === 'Occup\u00e9' ? 'Occup\u00e9' : friend.status}</span>
                </div>
                <div className="friend-card-body">
                  <span>{details.company}</span>
                  <span>{details.city}</span>
                </div>
              </button>
              <div className="friend-card-actions">
                <button type="button" className={`action-button compact friend-action friend-action-${tone === 'offline' ? 'offline' : 'online'}`} onClick={() => openDiscussion(friend)}>
                  <FontAwesomeIcon icon={faComments} />
                  {hasChat ? 'Discussion cr\u00e9\u00e9e' : 'Discuter'}
                </button>
                <button type="button" className="secondary-button compact friend-action" onClick={() => setSelectedFriend(friend)}>
                  <FontAwesomeIcon icon={faEye} />
                  Voir infos
                </button>
              </div>
            </article>
          );
        })}
        {filteredFriends.length === 0 ? (
          <article className="friend-card">
            <div className="friend-card-main">
              <div className="friend-card-copy">
                <strong>Aucun contact</strong>
                <small>Aucun profil ne correspond ? ce filtre.</small>
              </div>
            </div>
          </article>
        ) : null}
      </div>

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
                <span>M\u00e9tier</span>
                <strong>{selectedFriend.trade}</strong>
              </div>
              <div className="details-row">
                <span>Statut</span>
                <strong>{selectedFriend.status}</strong>
              </div>
              <div className="details-row">
                <span>Soci\u00e9t\u00e9</span>
                <strong>{getFriendDetails(selectedFriend).company}</strong>
              </div>
              <div className="details-row">
                <span>Email</span>
                <strong>{getFriendDetails(selectedFriend).email}</strong>
              </div>
              <div className="details-row">
                <span>T\u00e9l\u00e9phone</span>
                <strong>{getFriendDetails(selectedFriend).phone}</strong>
              </div>
              <div className="details-row">
                <span>Ville</span>
                <strong>{getFriendDetails(selectedFriend).city}</strong>
              </div>
              <div className="details-row align-start">
                <span>Comp\u00e9tences</span>
                <strong>{getFriendDetails(selectedFriend).skills.join(', ')}</strong>
              </div>
              <div className="details-row align-start">
                <span>Note</span>
                <strong>{getFriendDetails(selectedFriend).note}</strong>
              </div>
              <button type="button" className="action-button compact" onClick={() => openDiscussion(selectedFriend)}>
                <FontAwesomeIcon icon={faComments} />
                D?marrer une discussion
              </button>
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
                <input type="text" placeholder="Nom du contact" />
              </label>
              <label className="field">
                <span>M\u00e9tier</span>
                <input type="text" placeholder="Spécialité" />
              </label>
              <label className="field field-full">
                <span>Email</span>
                <input type="email" placeholder="nom@entreprise.be" />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button compact" onClick={() => setIsAddFriendOpen(false)}>
                Annuler
              </button>
              <button type="button" className="action-button compact" onClick={() => setIsAddFriendOpen(false)}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function ProfileSection({ profileForm, onChangeProfile }) {
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
  const updateProfileField = (field) => (event) => {
    onChangeProfile((current) => ({ ...current, [field]: event.target.value }));
  };
  const updateDraftField = (field) => (event) => {
    setProfileDraft((current) => ({ ...current, [field]: event.target.value }));
  };
  const updateProfileAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    onChangeProfile((current) => ({
      ...current,
      avatarUrl: URL.createObjectURL(file),
    }));
  };

  return (
    <section className="panel light-panel compact-screen profile-screen profile-screen-wide">
      <div className="panel-heading compact dense-heading">
        <div>
          <h3>Profil</h3>
        </div>
        <button
          type="button"
          className="action-button compact"
          onClick={() => onChangeProfile(initialProfile)}
        >
          Reinitialiser
        </button>
      </div>

      <div className="profile-shell">
        <div className="profile-hero-card">
          <div className="profile-hero-top">
            <div className="profile-identity-card">
              <div className="profile-avatar-panel">
                {profileForm.avatarUrl ? (
                  <img src={profileForm.avatarUrl} alt={profileForm.name} className="profile-avatar-large profile-avatar-image" />
                ) : (
                  <span className="profile-avatar-large">{profileForm.name.slice(0, 2).toUpperCase()}</span>
                )}
                <label className="secondary-button compact profile-avatar-upload">
                  Changer la photo
                  <input type="file" accept="image/*" className="messages-hidden-input" onChange={updateProfileAvatar} />
                </label>
              </div>
              <div className="profile-showcase-copy">
                <span className="profile-card-kicker">Identité</span>
                <div className="profile-inline-topline">
                  <span className="profile-inline-title">{profileForm.name}</span>
                  <button
                    type="button"
                    className={`profile-status-button ${profileForm.status === 'En ligne' ? 'is-active is-online' : ''}`}
                    onClick={() => onChangeProfile((current) => ({ ...current, status: 'En ligne' }))}
                  >
                    En ligne
                  </button>
                  <button
                    type="button"
                    className={`profile-status-button ${profileForm.status === 'Hors ligne' ? 'is-active is-offline' : ''}`}
                    onClick={() => onChangeProfile((current) => ({ ...current, status: 'Hors ligne' }))}
                  >
                    Hors ligne
                  </button>
                </div>
                <p className="profile-hero-note">Profil principal utilisé dans les échanges chantier et les discussions.</p>
                <div className="profile-inline-headline">
                  <span className="profile-inline-chip">
                    <span className="profile-inline-subtitle">{profileForm.role}</span>
                  </span>
                  <span className="profile-inline-chip">
                    <span className="profile-inline-subtitle">{profileForm.company}</span>
                  </span>
                </div>
                <div className="profile-hero-meta">
                  <span className={`friend-status ${profileForm.status === 'En ligne' ? 'friend-status-online' : 'friend-status-offline'}`}>
                    {profileForm.status}
                  </span>
                  <span className="profile-hero-meta-item">{profileForm.email}</span>
                  <span className="profile-hero-meta-item">{profileForm.phone}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="profile-detail-section">
          <div className="profile-edit-banner profile-edit-banner-inline">
            <span className="profile-card-kicker">Informations modifiables</span>
            <button
              type="button"
              className="secondary-button compact"
              onClick={() => {
                setProfileDraft(profileForm);
                setIsProfileEditOpen(true);
              }}
            >
              Modifier
            </button>
          </div>

          <div className="profile-edit-summary">
            <div className="details-row"><span>Email</span><strong>{profileForm.email}</strong></div>
            <div className="details-row"><span>Téléphone</span><strong>{profileForm.phone}</strong></div>
            <div className="details-row"><span>Rôle</span><strong>{profileForm.role}</strong></div>
            <div className="details-row"><span>Société</span><strong>{profileForm.company}</strong></div>
            <div className="details-row"><span>Ville</span><strong>{profileForm.city}</strong></div>
            <div className="details-row"><span>Spécialité</span><strong>{profileForm.specialty}</strong></div>
            <div className="details-row"><span>Disponibilité</span><strong>{profileForm.availability}</strong></div>
            <div className="details-row"><span>Zone</span><strong>{profileForm.zone}</strong></div>
            <div className="details-row"><span>Site web</span><strong>{profileForm.website}</strong></div>
          </div>
        </div>

        <div className="profile-actions-bar">
          <div className="profile-showcase-actions">
            <button type="button" className="secondary-button compact" onClick={() => onChangeProfile(initialProfile)}>
              Annuler les changements
            </button>
            <button type="button" className="action-button compact">
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      {isProfileEditOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card light-modal detail-modal friend-info-modal">
            <div className="panel-heading compact">
              <div>
                <h3>Modifier les informations</h3>
              </div>
              <button type="button" className="secondary-button compact" onClick={() => setIsProfileEditOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="profile-detail-grid">
              <label className="profile-detail-card">
                <span className="profile-card-kicker">Email</span>
                <input type="email" value={profileDraft.email} onChange={updateDraftField('email')} className="profile-card-input" />
              </label>
              <label className="profile-detail-card">
                <span className="profile-card-kicker">Téléphone</span>
                <input type="text" value={profileDraft.phone} onChange={updateDraftField('phone')} className="profile-card-input" />
              </label>
              <label className="profile-detail-card">
                <span className="profile-card-kicker">Rôle</span>
                <input type="text" value={profileDraft.role} onChange={updateDraftField('role')} className="profile-card-input" />
              </label>
              <label className="profile-detail-card">
                <span className="profile-card-kicker">Société</span>
                <input type="text" value={profileDraft.company} onChange={updateDraftField('company')} className="profile-card-input" />
              </label>
              <label className="profile-detail-card">
                <span className="profile-card-kicker">Ville</span>
                <input type="text" value={profileDraft.city} onChange={updateDraftField('city')} className="profile-card-input" />
              </label>
              <label className="profile-detail-card">
                <span className="profile-card-kicker">Spécialité</span>
                <input type="text" value={profileDraft.specialty} onChange={updateDraftField('specialty')} className="profile-card-input" />
              </label>
              <label className="profile-detail-card">
                <span className="profile-card-kicker">Disponibilité</span>
                <input type="text" value={profileDraft.availability} onChange={updateDraftField('availability')} className="profile-card-input" />
              </label>
              <label className="profile-detail-card">
                <span className="profile-card-kicker">Zone</span>
                <input type="text" value={profileDraft.zone} onChange={updateDraftField('zone')} className="profile-card-input" />
              </label>
              <label className="profile-detail-card profile-detail-card-wide">
                <span className="profile-card-kicker">Site web</span>
                <input type="text" value={profileDraft.website} onChange={updateDraftField('website')} className="profile-card-input" />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button compact" onClick={() => setIsProfileEditOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="action-button compact"
                onClick={() => {
                  onChangeProfile((current) => ({ ...current, ...profileDraft }));
                  setIsProfileEditOpen(false);
                }}
              >
                Enregistrer
              </button>
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
  onRemoveParticipant,
  onUpdateParticipantRole,
  participants,
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card light-modal detail-modal access-modal">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Accès</p>
            <h3>Gérer les intervenants</h3>
          </div>
          <button type="button" className="secondary-button compact" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="access-summary">
          {roleOptions.map((role) => (
            <div key={role} className="summary-row">
              <span>{role}</span>
              <strong>{participants.filter((participant) => getNormalizedRole(participant.role) === role).length}</strong>
            </div>
          ))}
        </div>

        <div className="access-list">
          {participants.map((participant) => {
            const normalizedRole = getNormalizedRole(participant.role);
            const isCurrentUser = participant.name === currentUserName;
            return (
              <article key={participant.id} className="list-row-button access-row">
                <div className="list-row-main">
                  <strong>{participant.name}</strong>
                  <small>{participant.company}</small>
                </div>
                <div className="access-controls">
                  <span className="pill">{participant.status}</span>
                  <select
                    className="module-select access-select"
                    disabled={isCurrentUser}
                    value={normalizedRole}
                    onChange={(event) => onUpdateParticipantRole(participant.id, event.target.value)}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="icon-button danger"
                    disabled={isCurrentUser}
                    onClick={() => onRemoveParticipant(participant.id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, detail, icon, compact = false }) {
  return (
    <article className={`metric-box light-metric ${compact ?'compact-metric-box' : ''}`}>
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
