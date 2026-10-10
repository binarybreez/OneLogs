"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Server } from "http";
import { Activity, AlertCircle, Clock, CheckCircle2, ArrowUpRight } from "lucide-react";
import { motion,Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, ease: "easeOut" },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } 
  },
};

export default function Page() {
  // Derived/extra data for new sections (kept client-side for now)
  const health = [
    { name: "Ingest Service", status: "healthy" },
    { name: "Alerting Service", status: "healthy" },
    { name: "Database", status: "healthy" },
    { name: "Public API", status: "healthy" },
  ];

  const [logsData, setLogsData] = React.useState<any>(null);

  // Calculate dynamic metrics
  const { errorRate, lineData, errorTrendData, topActivity, topSources } =
    React.useMemo(() => {
      if (!logsData?.logs) {
        return {
          errorRate: "0%",
          lineData: [],
          errorTrendData: [],
          topActivity: [],
          topSources: [],
        };
      }

      const logs = logsData.logs as any[];
      const total = logs.length;
      const errorCount = logs.filter((l) => l.type === "error").length;
      const rate = total > 0 ? ((errorCount / total) * 100).toFixed(1) : "0.0";

      // Prepare 12h buckets
      const now = new Date();
      const buckets = Array.from({ length: 12 }).map((_, i) => {
        const d = new Date(now.getTime() - (11 - i) * 60 * 60 * 1000);
        const h = d.getHours();
        const nextH = (h + 1) % 24;

        const getPart = (hour: number) => {
          const ampm = hour >= 12 ? "PM" : "AM";
          const h12 = hour % 12 || 12;
          return { h12, ampm };
        };

        const start = getPart(h);
        const end = getPart(nextH);

        let label;
        if (start.ampm === end.ampm) {
          label = `${start.h12}-${end.h12} ${start.ampm}`;
        } else {
          label = `${start.h12} ${start.ampm} - ${end.h12} ${end.ampm}`;
        }

        return {
          hour: d.getHours(),
          label,
          logs: 0,
          errors: 0,
        };
      });

      // Fill buckets
      logs.forEach((log) => {
        const dateStr = log.ingested_at?.replace(" ", "T") + "Z";
        const date = dateStr ? new Date(dateStr) : new Date();

        const hour = date.getHours();
        const bucket = buckets.find((b) => b.hour === hour);
        if (bucket) {
          bucket.logs++;
          if (log.type === "error") {
            bucket.errors++;
          }
        }
      });

      // Calculate Top Sources
      const sourceCounts: Record<string, number> = {};
      logs.forEach((log) => {
        const s = log.service;
        if (s) {
          sourceCounts[s] = (sourceCounts[s] || 0) + 1;
        }
      });

      const topSources = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        errorRate: `${rate}%`,
        lineData: buckets.map((b) => ({ hour: b.label, logs: b.logs })),
        errorTrendData: buckets.map((b) => ({
          hour: b.label,
          errors: b.errors,
        })),
        topActivity: logs.slice(0, 5).map((log) => {
          const dateStr = log.ingested_at?.replace(" ", "T") + "Z";
          const date = dateStr ? new Date(dateStr) : new Date();
          const time = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

          let status = "ok";
          if (log.type === "error") status = "error";
          else if (log.type === "warn") status = "warn";

          return {
            time,
            source: log.subsystem || log.appName || "unknown",
            action: log.operation || log.message || "-",
            status,
          };
        }),
        topSources,
      };
    }, [logsData]);

  // Live metrics state (ingestRate and backlog from SSE)
  const [metrics, setMetrics] = React.useState<{
    ingestRate: number;
    backlog: number;
    avgLatency: number;
  } | null>(null);

  // Format ingest rate as e.g. "2.3k/s" or "980/s"
  const fmtRate = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k/s` : `${n}/s`;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-[1600px] flex-col gap-8 p-6 lg:p-8"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Infrastructure Overview</h1>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors">
            Production
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Real-time telemetry, error rates, and system health across your agentic deployments.
        </p>
      </motion.div>

      {/* Row 1: Key Metrics Grid (6 Columns) */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Logs (24h)", value: logsData?.totalCount?.toLocaleString() ?? "0", icon: Server },
          { label: "Error Rate", value: errorRate, icon: AlertCircle, alert: parseFloat(errorRate) > 5 },
          { label: "Ingest Rate", value: metrics ? fmtRate(metrics.ingestRate) : "—", live: true },
          { label: "Active Alerts", value: "0", icon: AlertCircle },
          { label: "Avg Latency", value: metrics ? `${metrics.avgLatency}ms` : "—", live: true, icon: Clock },
          { label: "Queue Backlog", value: metrics ? metrics.backlog.toLocaleString() : "—", live: true },
        ].map((stat, i) => {
          const Icon = stat.icon as React.ElementType;
          return <Card 
            key={i} 
            className="group relative overflow-hidden rounded-xl border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-0.5"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] font-medium text-muted-foreground flex items-center gap-2">
                {stat.label}
              </CardTitle>
              {stat.live ? <LiveIndicator /> : stat.icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-semibold tracking-tight ${stat.alert ? 'text-destructive' : 'text-foreground'}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        })}
      </motion.div>

      {/* Row 2: Charts (3 Columns) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { title: "Logs Over Time (12h)", data: lineData },
          { title: "Error Trend (12h)", data: errorTrendData },
          { title: "Top Sources (24h)", data: topSources },
        ].map((chart, i) => (
          <Card key={i} className="flex flex-col rounded-xl border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-foreground">{chart.title}</CardTitle>
            </CardHeader>
            <CardContent className="h-[240px] flex-1 pb-6">
              {chart.data?.length > 0 ? (
                // Insert Recharts Components here (from previous masterclass)
                <div className="h-full w-full bg-muted/10 rounded-md border border-dashed border-border/40 flex items-center justify-center text-xs text-muted-foreground">
                   [Chart Canvas]
                </div>
              ) : (
                <EmptyState message="Awaiting telemetry data" />
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Row 3: Activity & Health Split (65/35) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Col: Activity Table */}
        <Card className="xl:col-span-8 rounded-xl border-border/40 bg-card/50 shadow-sm backdrop-blur-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between py-5">
            <CardTitle className="text-sm font-medium text-foreground">Top Activity (24h)</CardTitle>
            <Badge variant="secondary" className="text-[10px] font-mono bg-muted/50">Viewing latest 50</Badge>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="h-10 pl-6 text-xs text-muted-foreground">Time</TableHead>
                  <TableHead className="h-10 text-xs text-muted-foreground">Source</TableHead>
                  <TableHead className="h-10 text-xs text-muted-foreground">Action</TableHead>
                  <TableHead className="h-10 pr-6 text-right text-xs text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topActivity?.length > 0 ? (
                  topActivity.map((row: any, i: number) => (
                    <TableRow key={i} className="border-border/40 transition-colors hover:bg-muted/20">
                      <TableCell className="pl-6 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {row.time}
                      </TableCell>
                      <TableCell className="text-[13px] font-medium text-foreground">
                        {row.source}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground truncate max-w-[200px] lg:max-w-[300px]">
                        {row.action}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Badge 
                          variant="outline" 
                          className={`h-5 px-1.5 text-[10px] uppercase tracking-wider font-semibold ${
                            row.status === "ok" ? "border-emerald-500/20 text-emerald-600 bg-emerald-500/10" :
                            row.status === "warn" ? "border-amber-500/20 text-amber-600 bg-amber-500/10" :
                            "border-destructive/20 text-destructive bg-destructive/10"
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-[200px] text-center">
                      <EmptyState message="No recent activity found" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right Col: Stacked Health & Alerts */}
        <div className="flex flex-col gap-6 xl:col-span-4">
          
          {/* Health Panel */}
          <Card className="rounded-xl border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="py-5">
              <CardTitle className="text-sm font-medium text-foreground">System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {health?.map((h: any) => (
                <div key={h.name} className="group flex items-center justify-between rounded-lg border border-transparent p-2 -mx-2 transition-colors hover:bg-muted/30 hover:border-border/50">
                  <span className="text-[13px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    {h.name}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {h.status}
                    </span>
                    {h.status === "healthy" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className={`h-4 w-4 ${h.status === "degraded" ? "text-amber-500" : "text-destructive"}`} />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Alerts Panel */}
          <Card className="flex-1 rounded-xl border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between py-5 space-y-0">
              <CardTitle className="text-sm font-medium text-foreground">Recent Alerts</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-colors hover:text-foreground cursor-pointer" />
            </CardHeader>
            <CardContent className="flex h-[150px] items-center justify-center">
              <EmptyState message="No active alerts" />
            </CardContent>
          </Card>

        </div>
      </motion.div>
    </motion.div>
  );
}


const LiveIndicator = () => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative flex h-2 w-2 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs bg-zinc-900 text-zinc-50 border-zinc-800">
        Live telemetry active
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed border-border/40 bg-muted/10 p-6 text-center animate-in fade-in duration-500">
    <Activity className="mb-2 h-6 w-6 text-muted-foreground/30" />
    <span className="text-sm text-muted-foreground">{message}</span>
  </div>
);