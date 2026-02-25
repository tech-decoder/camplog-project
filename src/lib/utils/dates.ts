import { format, addDays, formatDistanceToNow, parseISO } from "date-fns";
import { IMPACT_REVIEW_DAYS } from "../constants";

export function getImpactReviewDueDate(changeDate: string): string {
  return format(addDays(parseISO(changeDate), IMPACT_REVIEW_DAYS), "yyyy-MM-dd");
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy");
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy h:mm a");
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

export function todayString(): string {
  return format(new Date(), "yyyy-MM-dd");
}
