import { useEffect, useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  Shield,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppShell,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import { authService } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import { resolveMediaUrl } from "@/lib/media-url";
import type { User } from "@/types/domain";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [{ title: "Settings | SocietyOne" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Status feedback
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Contact
  const [newEmail, setNewEmail] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingMobile, setSavingMobile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function loadUser() {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setFullName(currentUser.name || "");
      setUsername(currentUser.username || "");
      setNewEmail(currentUser.email || "");
      setNewMobile(currentUser.mobile || "");
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUser();
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!fullName.trim() || !username.trim()) {
      setProfileError("Full name and username cannot be empty.");
      return;
    }

    try {
      setSavingProfile(true);
      const updated = await authService.updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
      });
      setUser(updated);
      setProfileSuccess("Profile updated successfully.");
    } catch (err: unknown) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Image size must be under 5MB.");
      return;
    }

    try {
      setUploadingPhoto(true);
      setProfileError(null);
      setProfileSuccess(null);
      const updated = await authService.uploadProfilePhoto(file);
      setUser(updated);
      setProfileSuccess("Profile picture updated.");
    } catch (err: unknown) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to upload photo.",
      );
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto() {
    try {
      setUploadingPhoto(true);
      setProfileError(null);
      setProfileSuccess(null);
      const updated = await authService.deleteProfilePhoto();
      setUser(updated);
      setProfileSuccess("Profile picture removed.");
    } catch (err: unknown) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to remove photo.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setSavingPassword(true);
      await authService.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to change password.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setContactError(null);
    setContactSuccess(null);

    try {
      setSavingEmail(true);
      const res = await authService.changeEmail({ newEmail: newEmail.trim() });
      if ("needsVerification" in res) {
        setContactSuccess("Verification email sent to " + newEmail.trim());
      } else {
        setUser(res);
        setContactSuccess("Email updated successfully.");
      }
    } catch (err: unknown) {
      setContactError(
        err instanceof Error ? err.message : "Failed to update email.",
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleChangeMobile(e: React.FormEvent) {
    e.preventDefault();
    setContactError(null);
    setContactSuccess(null);

    try {
      setSavingMobile(true);
      const res = await authService.changeMobile({
        newMobileNumber: newMobile.trim(),
      });
      if ("needsVerification" in res) {
        setContactSuccess("Verification code sent to " + newMobile.trim());
      } else {
        setUser(res);
        setContactSuccess("Mobile number updated successfully.");
      }
    } catch (err: unknown) {
      setContactError(
        err instanceof Error ? err.message : "Failed to update mobile number.",
      );
    } finally {
      setSavingMobile(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError(null);

    if (!deletePassword) {
      setDeleteError("Password is required to confirm deactivation.");
      return;
    }

    try {
      setDeleting(true);
      await authService.deleteAccount({ password: deletePassword });
      void navigate({ to: "/login", search: { role: undefined } });
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to deactivate account.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Settings" eyebrow="Account">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-brand-blue" />
        </div>
      </AppShell>
    );
  }

  const rawAvatarUrl = user?.avatar || user?.profilePhotoUrl;
  const avatarUrl = resolveMediaUrl(rawAvatarUrl);

  return (
    <AppShell title="Settings" eyebrow="Account">
      <PageIntro
        eyebrow="Account"
        title="Account & Security settings"
        description="Manage your identity, profile picture, contact credentials, and security preferences."
      />

      <div className="mt-8 space-y-8 max-w-4xl">
        {/* Section 1: Profile & Photo */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeading title="Personal profile" />

          {profileError && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <p>{profileError}</p>
            </div>
          )}

          {profileSuccess && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5 shrink-0" />
              <p>{profileSuccess}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border">
            <div className="relative group">
              <div className="size-24 shrink-0 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center shadow-inner">
                {avatarUrl && !imgError ? (
                  <img
                    src={avatarUrl}
                    alt={user?.name || "Avatar"}
                    className="aspect-square size-full object-cover object-center"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <span className="text-3xl font-display font-bold text-foreground">
                    {user?.name?.slice(0, 1) ?? "U"}
                  </span>
                )}
              </div>

              {uploadingPhoto && (
                <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-brand-blue" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <h3 className="font-semibold text-foreground">Profile picture</h3>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or WebP up to 5MB. Rendered across gate and approvals.
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelected}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-1.5 size-4" /> Change photo
                </Button>
                {avatarUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    disabled={uploadingPhoto}
                    onClick={handleDeletePhoto}
                  >
                    <Trash2 className="mr-1.5 size-4" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <Button
                type="submit"
                className="bg-brand-blue hover:bg-brand-blue/90"
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save profile"
                )}
              </Button>
            </div>
          </form>
        </section>

        {/* Section 2: Contact credentials */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeading title="Contact credentials" />

          {contactError && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <p>{contactError}</p>
            </div>
          )}

          {contactSuccess && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5 shrink-0" />
              <p>{contactSuccess}</p>
            </div>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Email form */}
            <form onSubmit={handleChangeEmail} className="space-y-3">
              <Label htmlFor="emailInput">
                <Mail className="mr-1.5 inline size-4 text-brand-blue" /> Email address
              </Label>
              <Input
                id="emailInput"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={savingEmail || newEmail === user?.email}
              >
                {savingEmail ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : null}
                Update email
              </Button>
            </form>

            {/* Mobile form */}
            <form onSubmit={handleChangeMobile} className="space-y-3">
              <Label htmlFor="mobileInput">
                <Phone className="mr-1.5 inline size-4 text-brand-blue" /> Mobile number
              </Label>
              <Input
                id="mobileInput"
                value={newMobile}
                onChange={(e) => setNewMobile(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={savingMobile || newMobile === user?.mobile}
              >
                {savingMobile ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : null}
                Update mobile
              </Button>
            </form>
          </div>
        </section>

        {/* Section 3: Password & Security */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeading title="Change password" />

          {passwordError && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <p>{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5 shrink-0" />
              <p>{passwordSuccess}</p>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="curPassword">
                <Lock className="mr-1.5 inline size-3.5 text-muted-foreground" /> Current password
              </Label>
              <Input
                id="curPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">
                <KeyRound className="mr-1.5 inline size-3.5 text-muted-foreground" /> New password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">
                <KeyRound className="mr-1.5 inline size-3.5 text-muted-foreground" /> Confirm new password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>

            <div className="sm:col-span-3 pt-2">
              <Button
                type="submit"
                className="bg-brand-blue hover:bg-brand-blue/90"
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Updating password...
                  </>
                ) : (
                  "Change password"
                )}
              </Button>
            </div>
          </form>
        </section>

        {/* Section 4: Session info */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeading title="Session & security context" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Account Role</p>
              <p className="mt-1 font-semibold text-foreground">{user?.role}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Authentication</p>
              <p className="mt-1 font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="size-4 text-emerald-500" /> Stateless JWT
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Danger Zone */}
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Trash2 className="size-5 text-destructive" />
            <div>
              <h2 className="font-semibold text-destructive">Danger zone</h2>
              <p className="text-xs text-muted-foreground">
                Permanently close your account and invalidate associated sessions.
              </p>
            </div>
          </div>

          {!showDeleteModal ? (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteModal(true)}
              >
                Deactivate / Delete account
              </Button>
            </div>
          ) : (
            <form onSubmit={handleDeleteAccount} className="mt-5 space-y-4 max-w-md">
              {deleteError && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" /> {deleteError}
                </div>
              )}
              <div>
                <Label htmlFor="delPass">Your account password</Label>
                <Input
                  id="delPass"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  className="mt-1.5 bg-background"
                />
              </div>
              <div>
                <Label htmlFor="delConfirm">Type "DELETE" to confirm</Label>
                <Input
                  id="delConfirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  required
                  className="mt-1.5 bg-background"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : null}
                  Permanently delete account
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  );
}
