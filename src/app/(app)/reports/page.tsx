"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Loader2,
  FileText,
  Calendar,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth } from "date-fns";

interface Report {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  title: string;
  content: string;
  metadata: {
    total_changes?: number;
    reviewed?: number;
    positive?: number;
    negative?: number;
  };
  created_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState("weekly");

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        if (data.reports?.length > 0) {
          setSelectedReport(data.reports[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    const today = new Date();
    let periodStart: string;
    let periodEnd: string;

    if (reportType === "daily") {
      periodStart = format(subDays(today, 1), "yyyy-MM-dd");
      periodEnd = format(subDays(today, 1), "yyyy-MM-dd");
    } else if (reportType === "weekly") {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      periodStart = format(weekStart, "yyyy-MM-dd");
      periodEnd = format(weekEnd, "yyyy-MM-dd");
    } else {
      periodStart = format(startOfMonth(today), "yyyy-MM-dd");
      periodEnd = format(today, "yyyy-MM-dd");
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: reportType,
          period_start: periodStart,
          period_end: periodEnd,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedReport(data.report);
        setReports((prev) => [data.report, ...prev]);
      }
    } catch (err) {
      console.error("Failed to generate report:", err);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Generate Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Generate Report</span>
            </div>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Yesterday</SelectItem>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Report List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No reports yet. Generate your first one above.
              </p>
            ) : (
              <div className="space-y-1.5">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedReport?.id === report.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {report.report_type}
                      </Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {format(new Date(report.period_start), "MMM d")} -{" "}
                      {format(new Date(report.period_end), "MMM d, yyyy")}
                    </p>
                    {report.metadata?.total_changes != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {report.metadata.total_changes} changes
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Content */}
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            {generating ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">
                  Analyzing changes and generating report...
                </p>
              </div>
            ) : selectedReport ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedReport.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Generated{" "}
                      {format(
                        new Date(selectedReport.created_at),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                  {selectedReport.metadata && (
                    <div className="flex gap-2">
                      {selectedReport.metadata.positive != null &&
                        selectedReport.metadata.positive > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs"
                          >
                            {selectedReport.metadata.positive} positive
                          </Badge>
                        )}
                      {selectedReport.metadata.negative != null &&
                        selectedReport.metadata.negative > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs"
                          >
                            {selectedReport.metadata.negative} negative
                          </Badge>
                        )}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {(() => {
                    const lines = selectedReport.content.split("\n");
                    const elements: React.ReactNode[] = [];
                    let idx = 0;

                    while (idx < lines.length) {
                      const line = lines[idx];

                      // Detect markdown table block (consecutive | lines)
                      if (line.trim().startsWith("|")) {
                        const tableLines: string[] = [];
                        while (idx < lines.length && lines[idx].trim().startsWith("|")) {
                          tableLines.push(lines[idx]);
                          idx++;
                        }
                        // Parse table: need at least header + separator + 1 row
                        if (tableLines.length >= 3) {
                          const parseRow = (l: string) =>
                            l.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length);
                          const isSeparator = (l: string) => /^[\s|:-]+$/.test(l.replace(/\|/g, ""));
                          const headers = parseRow(tableLines[0]);
                          const dataRows = tableLines.slice(isSeparator(tableLines[1]) ? 2 : 1).map(parseRow);

                          elements.push(
                            <div key={`table-${idx}`} className="my-4 rounded-lg border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    {headers.map((h, hi) => (
                                      <TableHead key={hi} className="text-xs font-semibold">{h}</TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {dataRows.map((row, ri) => (
                                    <TableRow key={ri}>
                                      {row.map((cell, ci) => (
                                        <TableCell key={ci} className="text-xs py-2">{cell}</TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          );
                        } else {
                          // Fallback: render as plain text
                          tableLines.forEach((tl, ti) => {
                            elements.push(
                              <p key={`tl-${idx}-${ti}`} className="text-sm text-muted-foreground py-0.5 font-mono text-xs">{tl}</p>
                            );
                          });
                        }
                        continue;
                      }

                      // Section headings with separator
                      if (line.startsWith("## ")) {
                        elements.push(
                          <div key={idx} className="mt-6 mb-2">
                            <h2 className="text-base font-semibold text-foreground">
                              {line.replace("## ", "")}
                            </h2>
                            <Separator className="mt-2" />
                          </div>
                        );
                        idx++;
                        continue;
                      }

                      if (line.startsWith("### ")) {
                        elements.push(
                          <h3 key={idx} className="text-sm font-semibold mt-4 mb-1.5 text-foreground">
                            {line.replace("### ", "")}
                          </h3>
                        );
                        idx++;
                        continue;
                      }

                      // Numbered recommendations (1. **Bold:**)
                      const numberedMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*(.*)/);
                      if (numberedMatch) {
                        elements.push(
                          <div key={idx} className="flex items-start gap-3 p-3 my-1 rounded-lg border border-border/50 bg-muted/20">
                            <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                              {numberedMatch[1]}
                            </span>
                            <div>
                              <p className="text-sm font-semibold">{numberedMatch[2]}</p>
                              {numberedMatch[3] && (
                                <p className="text-xs text-muted-foreground mt-0.5">{numberedMatch[3]}</p>
                              )}
                            </div>
                          </div>
                        );
                        idx++;
                        continue;
                      }

                      // Bullet points with inline bold
                      if (line.startsWith("- ")) {
                        const content = line.replace("- ", "");
                        const parts = content.split(/(\*\*[^*]+\*\*)/g);
                        elements.push(
                          <p key={idx} className="text-sm text-muted-foreground pl-4 py-0.5">
                            <span className="text-muted-foreground/60 mr-1.5">&bull;</span>
                            {parts.map((part, pi) =>
                              part.startsWith("**") && part.endsWith("**") ? (
                                <span key={pi} className="font-semibold text-foreground">
                                  {part.replace(/\*\*/g, "")}
                                </span>
                              ) : (
                                <span key={pi}>{part}</span>
                              )
                            )}
                          </p>
                        );
                        idx++;
                        continue;
                      }

                      // Standalone bold
                      if (line.startsWith("**") && line.endsWith("**")) {
                        elements.push(
                          <p key={idx} className="text-sm font-semibold mt-3 mb-1 text-foreground">
                            {line.replace(/\*\*/g, "")}
                          </p>
                        );
                        idx++;
                        continue;
                      }

                      // Empty lines
                      if (line.trim() === "") {
                        elements.push(<div key={idx} className="h-2" />);
                        idx++;
                        continue;
                      }

                      // Default paragraph with inline bold support
                      const parts = line.split(/(\*\*[^*]+\*\*)/g);
                      elements.push(
                        <p key={idx} className="text-sm text-muted-foreground py-0.5">
                          {parts.map((part, pi) =>
                            part.startsWith("**") && part.endsWith("**") ? (
                              <span key={pi} className="font-semibold text-foreground">
                                {part.replace(/\*\*/g, "")}
                              </span>
                            ) : (
                              <span key={pi}>{part}</span>
                            )
                          )}
                        </p>
                      );
                      idx++;
                    }

                    return elements;
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  AI-Generated Reports
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Generate daily, weekly, or monthly reports summarizing your
                  campaign performance with AI-powered insights.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
