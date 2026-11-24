import { cn } from "@repo/ui/lib/utils";

/** Page title (24px) + 12px subtitle + optional action, as at the top of every app frame. */
export function PageHeader({
	title,
	subtitle,
	action,
	className,
}: {
	title: React.ReactNode;
	subtitle?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<header
			className={cn("animate-rise flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between sm:pb-8", className)}
		>
			<div className="min-w-0">
				<h1 className="h-page">{title}</h1>
				{subtitle && <div className="mt-3 text-xs text-muted">{subtitle}</div>}
			</div>
			{action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
		</header>
	);
}
