import { useState } from "react";
import { motion } from "framer-motion";
import { useGetTaskSummaryQuery, useGenerateSummaryMutation } from "@/store/api/aiApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, Lightbulb, TrendingUp, CheckCircle } from "lucide-react";

export function AISummary() {
  const { data: summary, isLoading, refetch } = useGetTaskSummaryQuery();
  const [generateSummary, { isLoading: generating }] = useGenerateSummaryMutation();

  const handleGenerate = async () => {
    try {
      await generateSummary().unwrap();
      refetch();
    } catch (error) {
      console.error("Failed to generate summary:", error);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Task Summary</CardTitle>
              <CardDescription>AI-powered insights for your tasks</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : summary ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div>
              <p className="text-sm leading-relaxed">{summary.summary}</p>
            </div>

            {summary.insights && summary.insights.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Insights
                </div>
                <ul className="space-y-1">
                  {summary.insights.map((insight, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <TrendingUp className="h-3 w-3 mt-1 text-primary" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.recommendations && summary.recommendations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Recommendations
                </div>
                <ul className="space-y-1">
                  {summary.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.generated_at && (
              <p className="text-xs text-muted-foreground">
                Generated: {new Date(summary.generated_at).toLocaleString()}
              </p>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No summary available</p>
            <p className="text-xs mt-1">Click Refresh to generate AI insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
