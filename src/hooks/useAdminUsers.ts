import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;

interface UserWithRoles extends Profile {
  roles: UserRole[];
}

export function useAdminUsers() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles = (profiles || []).map((profile) => ({
        ...profile,
        roles: (roles || []).filter((role) => role.user_id === profile.user_id),
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (userId: string, banned: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ banned })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((user) =>
          user.user_id === userId ? { ...user, banned } : user
        )
      );

      toast.success(banned ? 'User banned' : 'User unbanned');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
      return { error };
    }
  };

  const assignRole = async (userId: string, role: 'admin' | 'moderator' | 'user') => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('User already has this role');
          return { error };
        }
        throw error;
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.user_id === userId
            ? { ...user, roles: [...user.roles, data] }
            : user
        )
      );

      toast.success(`Role "${role}" assigned`);
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign role');
      return { error };
    }
  };

  const removeRole = async (userId: string, role: 'admin' | 'moderator' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((user) =>
          user.user_id === userId
            ? { ...user, roles: user.roles.filter((r) => r.role !== role) }
            : user
        )
      );

      toast.success(`Role "${role}" removed`);
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove role');
      return { error };
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    refreshUsers: fetchUsers,
    toggleBan,
    assignRole,
    removeRole,
  };
}
