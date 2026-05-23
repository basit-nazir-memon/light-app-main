import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DatabaseBackup, Monitor, Moon, Sun, UserCog, Download, Upload,
  FolderOpen, AlertTriangle, RefreshCw, HardDrive, Building2,
} from "lucide-react";
import { useBusinessSettings, useUpdateBusinessSettings } from "@/lib/store";
import {
  hasCustomerContactErrors,
  sanitizeCustomerPhoneInput,
  validateCustomerContact,
} from "@/lib/customer-validation";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { useSession } from "@/lib/auth";
import { loadAdminProfile, saveAdminProfile } from "@/lib/settings-storage";
import { fmtDate } from "@/lib/currency";
import { toast } from "sonner";
import {
  fetchBackupSettings,
  saveBackupDirectory,
  fetchBackupList,
  runBackupNow,
  downloadDatabaseExport,
  restoreDatabaseFile,
  restoreFromBackupFile,
  formatBytes,
  type BackupFileInfo,
} from "@/lib/backup-api";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { mode, setMode } = useTheme();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [backupDir, setBackupDir] = useState("");
  const [defaultBackupDir, setDefaultBackupDir] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [backupProgress, setBackupProgress] = useState(0);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreAck, setRestoreAck] = useState(false);

  const [restoreBackupOpen, setRestoreBackupOpen] = useState(false);
  const [restoreBackupName, setRestoreBackupName] = useState<string | null>(null);
  const [restoreBackupAck, setRestoreBackupAck] = useState(false);

  const { data: businessSettings, isLoading: businessLoading } = useBusinessSettings();
  const updateBusiness = useUpdateBusinessSettings();
  const [vatNumber, setVatNumber] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reloadBackupState = useCallback(async () => {
    const [settings, list] = await Promise.all([fetchBackupSettings(), fetchBackupList()]);
    setBackupDir(settings.backupDirectory);
    setDefaultBackupDir(settings.defaultBackupDirectory);
    setDbPath(settings.databasePath);
    setLastBackup(settings.lastBackupAt);
    setBackups(list);
  }, []);

  useEffect(() => {
    const fallback = {
      fullName: user?.full_name ?? "Admin",
      email: user?.email ?? "admin@yovaauto.co.uk",
    };
    const profile = loadAdminProfile(fallback);
    setFullName(profile.fullName);
    setEmail(profile.email);
  }, [user]);

  useEffect(() => {
    reloadBackupState()
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingSettings(false));
  }, [reloadBackupState]);

  useEffect(() => {
    if (businessSettings) {
      setVatNumber(businessSettings.vatNumber);
      setBusinessEmail(businessSettings.email);
      setBusinessPhone(businessSettings.phone);
    }
  }, [businessSettings]);

  const saveBusinessDetails = () => {
    if (!vatNumber.trim()) {
      toast.error("VAT registration number is required");
      return;
    }
    const contactErrors = validateCustomerContact(businessPhone, businessEmail);
    if (hasCustomerContactErrors(contactErrors)) {
      toast.error(contactErrors.phone ?? contactErrors.email ?? "Invalid contact details");
      return;
    }
    updateBusiness.mutate(
      {
        vatNumber: vatNumber.trim(),
        email: businessEmail.trim(),
        phone: businessPhone.trim(),
      },
      {
        onSuccess: () => toast.success("Business details saved — used on PDF quotes, invoices & reports"),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const afterRestore = () => {
    queryClient.clear();
    toast.success("Database restored — reloading app…");
    setTimeout(() => window.location.reload(), 800);
  };

  const saveProfile = () => {
    saveAdminProfile({ fullName, email });
    toast.success("Admin profile saved");
  };

  const updatePassword = () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated (demo — connect API to persist)");
  };

  const saveBackupLocation = async () => {
    if (!backupDir.trim()) {
      toast.error("Enter a backup folder path");
      return;
    }
    setBusy("save-dir");
    try {
      const res = await saveBackupDirectory(backupDir.trim());
      setBackupDir(res.backupDirectory);
      setLastBackup(res.lastBackupAt);
      toast.success("Backup storage location saved");
      await reloadBackupState();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save location");
    } finally {
      setBusy(null);
    }
  };

  const useDefaultBackupDir = () => {
    setBackupDir(defaultBackupDir);
  };

  const handleBackupNow = async () => {
    setBusy("backup");
    setBackupProgress(8);
    const tick = setInterval(() => {
      setBackupProgress((p) => (p >= 92 ? p : p + 10));
    }, 120);
    try {
      const result = await runBackupNow();
      setBackupProgress(100);
      setLastBackup(result.createdAt);
      toast.success(`Backup saved: ${result.filename}`);
      await reloadBackupState();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      clearInterval(tick);
      setTimeout(() => {
        setBackupProgress(0);
        setBusy(null);
      }, 400);
    }
  };

  const handleExport = async () => {
    setBusy("export");
    try {
      await downloadDatabaseExport();
      toast.success("Database file downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const onFileChosen = (file: File | null) => {
    if (!file) return;
    if (!file.name.endsWith(".db")) {
      toast.error("Please choose a .db SQLite file");
      return;
    }
    setRestoreFile(file);
    setRestoreAck(false);
    setRestoreOpen(true);
  };

  const confirmRestoreUpload = async () => {
    if (!restoreFile || !restoreAck) return;
    setBusy("restore");
    setRestoreOpen(false);
    try {
      const result = await restoreDatabaseFile(restoreFile);
      toast.info(`Safety copy created: ${result.safetyBackup}`);
      afterRestore();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(null);
      setRestoreFile(null);
      setRestoreAck(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmRestoreFromList = async () => {
    if (!restoreBackupName || !restoreBackupAck) return;
    setBusy("restore");
    setRestoreBackupOpen(false);
    try {
      const result = await restoreFromBackupFile(restoreBackupName);
      toast.info(`Safety copy created: ${result.safetyBackup}`);
      afterRestore();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(null);
      setRestoreBackupName(null);
      setRestoreBackupAck(false);
    }
  };

  const lastBackupLabel = lastBackup
    ? fmtDate(lastBackup.slice(0, 10))
    : "Never";

  return (
    <AppLayout>
      <div className="space-y-6 w-full">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Appearance, business details, backups, and admin account.</p>
        </div>

        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 h-auto p-1">
            <TabsTrigger value="theme" className="gap-2 py-2">
              <Sun className="size-4 shrink-0" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="gap-2 py-2">
              <Building2 className="size-4 shrink-0" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="backups" className="gap-2 py-2">
              <DatabaseBackup className="size-4 shrink-0" />
              <span className="hidden sm:inline">Backups</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2 py-2">
              <UserCog className="size-4 shrink-0" />
              <span className="hidden sm:inline">Admin profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Choose how Yova Auto looks on this device.</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={mode}
                  onValueChange={(v) => setMode(v as ThemeMode)}
                  className="grid gap-3"
                >
                  <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="light" />
                    <Sun className="size-4 text-amber-500" />
                    <div>
                      <div className="font-medium text-sm">Light</div>
                      <div className="text-xs text-muted-foreground">Bright workspace</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="dark" />
                    <Moon className="size-4 text-sky-400" />
                    <div>
                      <div className="font-medium text-sm">Dark</div>
                      <div className="text-xs text-muted-foreground">Reduced glare</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="system" />
                    <Monitor className="size-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">System</div>
                      <div className="text-xs text-muted-foreground">Match your device preference</div>
                    </div>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-5 text-primary" />
                  Business details on PDFs
                </CardTitle>
                <CardDescription>
                  VAT number, email, and phone shown in the footer of quotations, invoices, and report PDFs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="vat-number">VAT registration number</Label>
                    <Input
                      id="vat-number"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      placeholder="GB 123 4567 89"
                      disabled={businessLoading || updateBusiness.isPending}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="business-email">Business email</Label>
                    <Input
                      id="business-email"
                      type="email"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="hello@yovaauto.co.uk"
                      disabled={businessLoading || updateBusiness.isPending}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="business-phone">Business phone</Label>
                    <Input
                      id="business-phone"
                      type="tel"
                      value={businessPhone}
                      onChange={(e) =>
                        setBusinessPhone(sanitizeCustomerPhoneInput(e.target.value))
                      }
                      placeholder="+44 161 555 0199"
                      disabled={businessLoading || updateBusiness.isPending}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Phone: numbers, spaces, and + only. Email must be a valid address.
                </p>
                <Button
                  onClick={saveBusinessDetails}
                  disabled={businessLoading || updateBusiness.isPending}
                >
                  {updateBusiness.isPending ? "Saving…" : "Save business details"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backups" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseBackup className="size-5 text-primary" />
                  Backups &amp; database
                </CardTitle>
            <CardDescription>
              Snapshot the SQLite database, export a copy, or restore from a file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>Before you restore</AlertTitle>
              <AlertDescription>
                Loading a database file <strong>replaces all current data</strong> (customers, vehicles, jobs, quotes, invoices).
                A safety backup is created automatically in your backup folder before any restore.
                You must reload the app after restore.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label htmlFor="backup-dir" className="flex items-center gap-2">
                <FolderOpen className="size-4" />
                Backup storage location
              </Label>
              <p className="text-xs text-muted-foreground">
                Full path on the machine where the API runs (e.g.{" "}
                <code className="text-[11px] bg-muted px-1 rounded">C:\Users\You\Documents\YovaBackups</code>
                ). Snapshots from &quot;Backup now&quot; are saved here.
              </p>
              <Input
                id="backup-dir"
                value={backupDir}
                onChange={(e) => setBackupDir(e.target.value)}
                placeholder={defaultBackupDir || "Path to backup folder"}
                disabled={loadingSettings || !!busy}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={saveBackupLocation}
                  disabled={!!busy || loadingSettings}
                >
                  {busy === "save-dir" ? "Saving…" : "Save location"}
                </Button>
                <Button
                  variant="outline"
                  onClick={useDefaultBackupDir}
                  disabled={!!busy || loadingSettings}
                >
                  Use default folder
                </Button>
              </div>
              {dbPath && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <HardDrive className="size-3.5 mt-0.5 shrink-0" />
                  Live database: <span className="font-mono break-all">{dbPath}</span>
                </p>
              )}
            </div>

            <div className="rounded-lg bg-muted/40 border p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Last backup
              </div>
              <div className="text-lg font-semibold mt-1">{lastBackupLabel}</div>
            </div>

            {backupProgress > 0 && <Progress value={backupProgress} className="h-2" />}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleBackupNow}
                disabled={!!busy || loadingSettings}
              >
                <DatabaseBackup className="size-4 mr-2" />
                {busy === "backup" ? "Backing up…" : "Backup now"}
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!!busy || loadingSettings}
              >
                <Download className="size-4 mr-2" />
                {busy === "export" ? "Exporting…" : "Export database (.db)"}
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!busy || loadingSettings}
              >
                <Upload className="size-4 mr-2" />
                Load database file…
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".db,application/octet-stream"
                className="hidden"
                onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => reloadBackupState().then(() => toast.success("Backup list refreshed"))}
                disabled={!!busy || loadingSettings}
                aria-label="Refresh backup list"
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Snapshots in backup folder</div>
              {backups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No snapshots yet. Run &quot;Backup now&quot; to create one.</p>
              ) : (
                <ul className="rounded-lg border divide-y max-h-56 overflow-y-auto">
                  {backups.map((b) => (
                    <li key={b.filename} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-mono text-xs truncate">{b.filename}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(b.createdAt.slice(0, 10))} · {formatBytes(b.size)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!busy}
                        onClick={() => {
                          setRestoreBackupName(b.filename);
                          setRestoreBackupAck(false);
                          setRestoreBackupOpen(true);
                        }}
                      >
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="size-5 text-primary" />
                  Admin profile
                </CardTitle>
                <CardDescription>Manage the signed-in administrator account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="admin-name">Full name</Label>
                <Input
                  id="admin-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={saveProfile}>Save profile</Button>

            <div className="border-t pt-6 space-y-4">
              <div className="text-sm font-semibold">Change password</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button variant="outline" onClick={updatePassword}>Update password</Button>
            </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Replace entire database?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  You are about to load <strong className="text-foreground">{restoreFile?.name}</strong>.
                  This will overwrite the live database on the server.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>All current records will be replaced</li>
                  <li>A pre-restore safety backup will be created automatically</li>
                  <li>The app will reload when finished</li>
                </ul>
                <label className="flex items-start gap-2 pt-2 cursor-pointer">
                  <Checkbox
                    checked={restoreAck}
                    onCheckedChange={(v) => setRestoreAck(v === true)}
                  />
                  <span>I understand this cannot be undone except by restoring another backup</span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "restore"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!restoreAck || busy === "restore"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmRestoreUpload();
              }}
            >
              {busy === "restore" ? "Restoring…" : "Load database"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreBackupOpen} onOpenChange={setRestoreBackupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Restore from snapshot?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Restore <strong className="font-mono text-foreground">{restoreBackupName}</strong> over the live database?
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={restoreBackupAck}
                    onCheckedChange={(v) => setRestoreBackupAck(v === true)}
                  />
                  <span>I understand current data will be replaced</span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "restore"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!restoreBackupAck || busy === "restore"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmRestoreFromList();
              }}
            >
              {busy === "restore" ? "Restoring…" : "Restore snapshot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
