import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../supabase';
import { emptyWorkspace } from '../data/workspaceDefaults';
import {
  addProjectSectionRecord,
  archiveDocumentRecord,
  archivePlanRecord,
  archiveProjectRecord,
  archiveTaskRecord,
  createProjectTaskRecord,
  deleteTaskRecord,
  ensureDirectConversationRecord,
  inviteFriendRecord,
  inviteProjectMemberRecord,
  loadWorkspace,
  markNotificationsReadRecord,
  removeProjectMemberRecord,
  removeFriendRecord,
  respondToFriendInvitationRecord,
  respondToProjectInvitationRecord,
  savePersonalTaskRecord,
  saveProfileRecord,
  saveProjectRecord,
  sendConversationMessageRecord,
  updateProjectMemberPermissionsRecord,
  updateProjectMemberRoleRecord,
  updateTaskRecord,
  upsertPlanRecord,
  upsertProjectDocumentRecord,
} from '../services/workspaceApi';

export const useWorkspaceData = () => {
  const [workspace, setWorkspace] = useState(emptyWorkspace);
  const [sessionUser, setSessionUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const normalizeError = useCallback((value) => {
    if (value instanceof Error) {
      return value;
    }

    if (value && typeof value === 'object') {
      const message =
        value.message ||
        value.error_description ||
        value.description ||
        value.details ||
        value.hint ||
        JSON.stringify(value);
      return new Error(message);
    }

    return new Error(String(value || 'Erreur inconnue'));
  }, []);

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
    } else if (hasInitialized) {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const { workspace: nextWorkspace, user } = await loadWorkspace();
      setWorkspace(nextWorkspace);
      setSessionUser(user);
      setHasInitialized(true);
    } catch (nextError) {
      const normalized = normalizeError(nextError);
      console.error(normalized);
      setError(normalized);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [hasInitialized, normalizeError]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!sessionUser) {
      return undefined;
    }

    const channel = supabase
      .channel(`workspace-${sessionUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => reload({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => reload({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => reload({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => reload({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => reload({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_events' }, () => reload({ silent: true }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload, sessionUser]);

  const runMutation = useCallback(
    async (work) => {
      setError(null);

      try {
        return await work();
      } catch (nextError) {
        const normalized = normalizeError(nextError);
        console.error(normalized);
        setError(normalized);
        return null;
      }
    },
    [normalizeError]
  );

  const actions = useMemo(
    () => ({
      saveProfile(profile, avatarFile) {
        return runMutation(async () => {
          await saveProfileRecord(profile, avatarFile);
          await reload({ silent: true });
          return true;
        });
      },
      saveProject(payload) {
        return runMutation(async () => {
          await saveProjectRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      inviteProjectMember(payload) {
        return runMutation(async () => {
          await inviteProjectMemberRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      inviteFriend(payload) {
        return runMutation(async () => {
          await inviteFriendRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      respondToFriendInvitation(payload) {
        return runMutation(async () => {
          await respondToFriendInvitationRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      removeFriend(payload) {
        return runMutation(async () => {
          await removeFriendRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      updateProjectMemberRole(memberId, role) {
        return runMutation(async () => {
          await updateProjectMemberRoleRecord(memberId, role);
          await reload({ silent: true });
          return true;
        });
      },
      updateProjectMemberPermissions(memberId, permissions) {
        return runMutation(async () => {
          await updateProjectMemberPermissionsRecord(memberId, permissions);
          await reload({ silent: true });
          return true;
        });
      },
      removeProjectMember(memberId) {
        return runMutation(async () => {
          await removeProjectMemberRecord(memberId);
          await reload({ silent: true });
          return true;
        });
      },
      addProjectSection(projectId, name) {
        return runMutation(async () => {
          await addProjectSectionRecord(projectId, name);
          await reload({ silent: true });
          return true;
        });
      },
      createProjectTask(payload) {
        return runMutation(async () => {
          await createProjectTaskRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      updateTask(payload) {
        return runMutation(async () => {
          await updateTaskRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      deleteTask(taskId) {
        return runMutation(async () => {
          await deleteTaskRecord(taskId);
          await reload({ silent: true });
          return true;
        });
      },
      archiveProject(projectId, archived) {
        return runMutation(async () => {
          await archiveProjectRecord(projectId, archived);
          await reload({ silent: true });
          return true;
        });
      },
      archiveTask(payload) {
        return runMutation(async () => {
          await archiveTaskRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      archiveDocument(payload) {
        return runMutation(async () => {
          await archiveDocumentRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      archivePlan(payload) {
        return runMutation(async () => {
          await archivePlanRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      savePersonalTask(payload) {
        return runMutation(async () => {
          await savePersonalTaskRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      upsertAdminDocument(payload) {
        return runMutation(async () => {
          await upsertProjectDocumentRecord({ ...payload, kind: payload.doc.type || 'Offres' });
          await reload({ silent: true });
          return true;
        });
      },
      upsertProjectDocument(payload) {
        return runMutation(async () => {
          await upsertProjectDocumentRecord({ ...payload, kind: 'Document' });
          await reload({ silent: true });
          return true;
        });
      },
      upsertPlan(payload) {
        return runMutation(async () => {
          await upsertPlanRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      ensureDirectConversation(payload) {
        return runMutation(async () => {
          const conversationId = await ensureDirectConversationRecord(payload);
          await reload({ silent: true });
          return conversationId;
        });
      },
      sendMessage(payload) {
        return runMutation(async () => {
          await sendConversationMessageRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      respondToInvitation(payload) {
        return runMutation(async () => {
          await respondToProjectInvitationRecord(payload);
          await reload({ silent: true });
          return true;
        });
      },
      markNotificationsRead(notificationIds) {
        return runMutation(async () => {
          await markNotificationsReadRecord(notificationIds);
          await reload({ silent: true });
          return true;
        });
      },
    }),
    [reload, runMutation]
  );

  return {
    workspace,
    sessionUser,
    isLoading,
    isRefreshing,
    error,
    reload,
    actions,
  };
};
