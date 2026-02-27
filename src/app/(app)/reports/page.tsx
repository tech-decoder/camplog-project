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
} from "lucide-react";
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
        <Loader2 className="h-6 w-6 animate-spin text-[#366ae8]" />
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
              <BarChart3 className="h-5 w-5 text-[#366ae8]" />
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
              className="bg-[#366ae8] hover:bg-[#2d5bcf] text-white"
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
                        ? "bg-[#366ae8]/10 border border-[#366ae8]/20"
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
                <Loader2 className="h-8 w-8 animate-spin text-[#366ae8] mb-3" />
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
                            className="bg-emerald-50 text-emerald-700 text-xs"
                          >
                            {selectedReport.metadata.positive} positive
                          </Badge>
                        )}
                      {selectedReport.metadata.negative != null &&
                        selectedReport.metadata.negative > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-rose-50 text-rose-700 text-xs"
                          >
                            {selectedReport.metadata.negative} negative
                          </Badge>
                        )}
                    </div>
                  )}
                </div>
                <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
                  {selectedReport.content.split("\n").map((line, i) => {
                    if (line.startsWith("## ")) {
                      return (
                        <h2
                          key={i}
                          className="text-base font-semibold mt-6 mb-2 text-foreground"
                        >
                          {line.replace("## ", "")}
                        </h2>
                      );
                    }
                    if (line.startsWith("### ")) {
                      return (
                        <h3
                          key={i}
                          className="text-sm font-semibold mt-4 mb-1.5 text-foreground"
                        >
                          {line.replace("### ", "")}
                        </h3>
                      );
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <p
                          key={i}
                          className="text-sm text-muted-foreground pl-4 py-0.5"
                        >
                          &bull; {line.replace("- ", "")}
                        </p>
                      );
                    }
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return (
                        <p key={i} className="text-sm font-semibold mt-3 mb-1">
                          {line.replace(/\*\*/g, "")}
                        </p>
                      );
                    }
                    if (line.trim() === "") return <br key={i} />;
                    return (
                      <p key={i} className="text-sm text-muted-foreground py-0.5">
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-[#366ae8]/10 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-[#366ae8]" />
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
