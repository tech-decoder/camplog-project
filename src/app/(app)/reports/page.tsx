"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              AI-Generated Reports
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Once you have a few changes logged, you&apos;ll be able to
              generate daily and weekly AI-powered reports summarizing your
              campaign performance.
            </p>
            <Button disabled>Coming Soon</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
