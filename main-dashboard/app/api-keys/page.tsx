"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Key, Clipboard, Trash2, CheckCircle2, 
  AlertTriangle, RefreshCw, Send, Loader2 
} from "lucide-react";
import { toast } from "sonner";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// --- Types mapping exactly to your backend spec ---
interface ApiKey {
  id: string;
  prefix: string;
  createdAt: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function ApiKeysPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // --- UI State ---
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTestingLog, setIsTestingLog] = useState(false);

  // Dialog states
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [keyToRegenerate, setKeyToRegenerate] = useState<ApiKey | null>(null);

  // --- API Fetcher (Clerk Auth Injector) ---
  const authenticatedFetch = useCallback(
    async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      
      const headers = new Headers(options.headers || {});
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
      
      // Allow 204 No Content for DELETE
      if (res.status === 204) return {} as T;
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `Request failed (${res.status})`);
      }
      return res.json();
    },
    [getToken]
  );

  // --- Queries & Mutations ---

  // GET /api/api-keys
  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => authenticatedFetch<ApiKey[]>("/api-keys"),
  });

  // POST /api/api-keys
  const createMutation = useMutation({
    mutationFn: () => authenticatedFetch<{ key: string }>("/api-keys", { method: "POST" }),
    onSuccess: (data) => {
      setGeneratedSecret(data.key);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created successfully.");
    },
    onError: () => toast.error("Failed to create API key."),
  });

  // DELETE /api/api-keys/:id
  const revokeMutation = useMutation({
    mutationFn: (id: string) => authenticatedFetch(`/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setKeyToRevoke(null);
      toast.success("API key revoked.");
    },
    onError: () => toast.error("Failed to revoke key."),
  });

  // POST /api/api-keys/:id/regenerate
  const regenerateMutation = useMutation({
    mutationFn: (id: string) => authenticatedFetch<{ key: string }>(`/api-keys/${id}/regenerate`, { method: "POST" }),
    onSuccess: (data) => {
      setGeneratedSecret(data.key);
      setKeyToRegenerate(null);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key regenerated.");
    },
    onError: () => toast.error("Failed to regenerate key."),
  });

  // --- Handlers ---
  const handleCopySecret = () => {
    if (!generatedSecret) return;
    navigator.clipboard.writeText(generatedSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestIngestion = async () => {
    if (!generatedSecret) return;
    setIsTestingLog(true);
    try {
      const res = await fetch(`${API_BASE_URL}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": generatedSecret, // Uses plaintext key (Ingestion spec)
        },
        body: JSON.stringify({
          logs: [{
            type: "info",
            message: "Test log from dashboard",
            appName: "dashboard-test",
            environment: "development",
          }],
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Test log successfully ingested!");
    } catch (err) {
      toast.error("Failed to send test log. Check your backend configuration.");
    } finally {
      setIsTestingLog(false);
    }
  };

  const handleCloseReveal = () => {
    setGeneratedSecret(null); // Purge plaintext key from UI state entirely
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-5xl w-full">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage credentials used by your SDKs to ingest logs.
            </p>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create Key
          </Button>
        </div>

        {/* Data Table */}
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Key className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium">No API keys configured</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create a key to start sending logs to your pipeline.
              </p>
              <Button variant="outline" onClick={() => createMutation.mutate()}>
                Create your first key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[300px]">Key Prefix</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => {
                  const isRevoked = k.revoked_at !== null;
                  
                  return (
                    <TableRow 
                      key={k.id} 
                      className={`transition-colors ${isRevoked ? "bg-muted/20 opacity-60 grayscale" : "hover:bg-muted/50"}`}
                    >
                      <TableCell className="font-mono font-medium">{k.prefix}••••••••••••••••</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isRevoked ? "secondary" : "default"}
                          className={!isRevoked ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25" : ""}
                        >
                          {isRevoked ? "Revoked" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-blue-500"
                                disabled={isRevoked}
                                onClick={() => setKeyToRegenerate(k)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerate Key</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                disabled={isRevoked}
                                onClick={() => setKeyToRevoke(k)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Revoke Key</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* ONE-TIME REVEAL MODAL */}
        <Dialog open={!!generatedSecret} onOpenChange={(open) => !open && handleCloseReveal()}>
          <DialogContent className="sm:max-w-xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Your API Key is ready
              </DialogTitle>
              <DialogDescription className="text-destructive font-medium mt-2 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                Please copy this key now. You will not be able to see it again after closing this window.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted/50 border p-4 rounded-lg flex items-center justify-between gap-4 font-mono text-sm mt-4">
              <span className="truncate flex-1 select-all font-medium text-foreground">
                {generatedSecret}
              </span>
              <Button
                variant={copied ? "default" : "secondary"}
                size="sm"
                onClick={handleCopySecret}
                className={copied ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
              >
                {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Clipboard className="h-4 w-4 mr-2" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="bg-card border rounded-lg p-4 mt-4 text-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-muted-foreground">
                Verify this key works by sending a test payload to your ingestion pipeline.
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="shrink-0"
                onClick={handleTestIngestion}
                disabled={isTestingLog}
              >
                {isTestingLog ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Test this key
              </Button>
            </div>

            <DialogFooter className="mt-6 sm:justify-start">
              <Button variant="default" className="w-full sm:w-auto" onClick={handleCloseReveal}>
                I have saved my key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CONFIRMATION: Revoke */}
        <AlertDialog open={!!keyToRevoke} onOpenChange={(open) => !open && setKeyToRevoke(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                Revoking the key ending in <strong>{keyToRevoke?.prefix}</strong> will immediately reject all future log ingestions using this key. SDKs relying on this key will begin failing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => keyToRevoke && revokeMutation.mutate(keyToRevoke.id)}
              >
                {revokeMutation.isPending ? "Revoking..." : "Revoke Key"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* CONFIRMATION: Regenerate */}
        <AlertDialog open={!!keyToRegenerate} onOpenChange={(open) => !open && setKeyToRegenerate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
              <AlertDialogDescription>
                This will invalidate the current key starting with <strong>{keyToRegenerate?.prefix}</strong> and generate a brand new plaintext secret. Existing applications using the old key will lose access immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => keyToRegenerate && regenerateMutation.mutate(keyToRegenerate.id)}
              >
                {regenerateMutation.isPending ? "Regenerating..." : "Yes, regenerate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </TooltipProvider>
  );
}