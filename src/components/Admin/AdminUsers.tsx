import { useState } from 'react';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, MoreHorizontal, Shield, ShieldOff, UserX, UserCheck, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const roleColors: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  moderator: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  user: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export function AdminUsers() {
  const { users, loading, refreshUsers, toggleBan, assignRole, removeRole } = useAdminUsers();
  const [banDialog, setBanDialog] = useState<{ userId: string; currentBan: boolean } | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Users</h2>
          <span className="text-muted-foreground">({users.length})</span>
        </div>

        <Button variant="outline" onClick={refreshUsers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email || '-'}</TableCell>
                <TableCell>{user.display_name || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant="outline"
                          className={roleColors[role.role] || ''}
                        >
                          {role.role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No roles</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.banned ? (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                      Banned
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Manage Roles</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          const hasAdmin = user.roles.some((r) => r.role === 'admin');
                          if (hasAdmin) {
                            removeRole(user.user_id, 'admin');
                          } else {
                            assignRole(user.user_id, 'admin');
                          }
                        }}
                      >
                        {user.roles.some((r) => r.role === 'admin') ? (
                          <>
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Remove Admin
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Make Admin
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const hasMod = user.roles.some((r) => r.role === 'moderator');
                          if (hasMod) {
                            removeRole(user.user_id, 'moderator');
                          } else {
                            assignRole(user.user_id, 'moderator');
                          }
                        }}
                      >
                        {user.roles.some((r) => r.role === 'moderator') ? (
                          <>
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Remove Moderator
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Make Moderator
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setBanDialog({
                            userId: user.user_id,
                            currentBan: user.banned,
                          })
                        }
                        className={user.banned ? 'text-green-500' : 'text-red-500'}
                      >
                        {user.banned ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Unban User
                          </>
                        ) : (
                          <>
                            <UserX className="h-4 w-4 mr-2" />
                            Ban User
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!banDialog} onOpenChange={() => setBanDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {banDialog?.currentBan ? 'Unban User' : 'Ban User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {banDialog?.currentBan
                ? 'Are you sure you want to unban this user? They will regain access to the platform.'
                : 'Are you sure you want to ban this user? They will lose access to the platform.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (banDialog) {
                  toggleBan(banDialog.userId, !banDialog.currentBan);
                  setBanDialog(null);
                }
              }}
              className={
                banDialog?.currentBan
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {banDialog?.currentBan ? 'Unban' : 'Ban'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
