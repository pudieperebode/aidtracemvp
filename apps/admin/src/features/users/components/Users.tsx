"use client";

import { useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { Button } from "@repo/ui/button";
import type { AdminRecord } from "@/lib/api/dto";
import { errorMessage } from "@/lib/api/errors";
import { useToast } from "@/lib/use-toast";
import { useSession } from "@/features/auth/store";
import { useAdminAction } from "@/features/admin/hooks";
import { ResourceScreen } from "@/features/admin/components/ResourceScreen";
import { ReasonDialog } from "@/features/admin/components/ReasonDialog";
import { pick, StatusChip, text, Value } from "@/features/admin/values";

const STATUS = [
	{ value: "", label: "All users" },
	{ value: "active", label: "Active" },
	{ value: "suspended", label: "Suspended" },
];

const wallet = (u: AdminRecord) => text(u, "walletAddress", "address", "wallet");

/** `/admin/users`: search by wallet or organization name, suspend (with a reason, confirmed) and reactivate. */
export function Users() {
	const toast = useToast();
	const me = useSession((s) => s.address);
	const [suspending, setSuspending] = useState<AdminRecord | null>(null);
	const suspend = useAdminAction<{ id: string; reason: string }>(
		({ id }) => `/users/${encodeURIComponent(id)}/suspend`,
		({ reason }) => ({ reason }),
	);
	const reactivate = useAdminAction<string>((id) => `/users/${encodeURIComponent(id)}/reactivate`);

	const actions = (u: AdminRecord) => {
		const id = String(u.id);
		const suspended = text(u, "status") === "suspended";
		if (suspended)
			return (
				<Button
					size="sm"
					variant="approve"
					isLoading={reactivate.isPending}
					loadingText="Reactivating…"
					onClick={() =>
						reactivate.mutate(id, {
							onSuccess: () => toast.success("User reactivated", { description: wallet(u) }),
							onError: (e) => toast.error("The user wasn't reactivated", { description: errorMessage(e) }),
						})
					}
				>
					<RotateCcw /> Reactivate
				</Button>
			);
		if (wallet(u) === me || pick(u, "roles.platformAdmin") === true) return null;
		return (
			<Button size="sm" variant="reject" onClick={() => setSuspending(u)}>
				<Ban /> Suspend
			</Button>
		);
	};

	return (
		<>
			<ResourceScreen
				title="Users"
				subtitle="Every wallet that has signed in. Suspending a user ends their sessions and blocks sign-in; it moves no funds."
				resource="users"
				search={{ param: "search", label: "Search users", placeholder: "Wallet address or organization" }}
				filters={[{ param: "status", label: "Status", options: STATUS }]}
				columns={[
					{ key: "wallet", header: "Wallet", mobile: "title", cell: (u) => <Value name="walletAddress" value={wallet(u)} /> },
					{
						key: "org",
						header: "Organization",
						cell: (u) => text(u, "organization.name", "organizationName") ?? <span className="text-muted">—</span>,
					},
					{
						key: "roles",
						header: "Roles",
						cell: (u) =>
							[
								pick(u, "roles.platformAdmin") === true && "Platform admin",
								pick(u, "roles.organizationAdmin") === true && "Organization admin",
							]
								.filter(Boolean)
								.join(" · ") || <span className="text-muted">—</span>,
					},
					{
						key: "status",
						header: "Status",
						cell: (u) => (text(u, "status") ? <StatusChip status={text(u, "status")!} /> : "—"),
					},
					{
						key: "seen",
						header: "Last sign-in",
						cell: (u) => <Value name="lastSignInAt" value={pick(u, "lastSignInAt", "lastLoginAt")} />,
					},
					{
						key: "actions",
						header: <span className="sr-only">Actions</span>,
						mobile: "label",
						className: "w-[140px]",
						cell: actions,
					},
				]}
				detail={(u) => ({
					title: wallet(u) ? `User ${wallet(u)!.slice(0, 6)}…` : "User",
					path: `/users/${encodeURIComponent(String(u.id))}`,
					actions,
				})}
				empty={{ title: "No users yet", body: "Wallets appear here after their first sign-in." }}
			/>
			<ReasonDialog
				open={!!suspending}
				onOpenChange={(open) => !open && setSuspending(null)}
				title="Suspend this user?"
				description={
					<>
						<span className="font-mono">{suspending ? wallet(suspending) : ""}</span> is signed out and can&apos;t sign in until
						reactivated. Their campaigns and funds are not touched.
					</>
				}
				label="Reason"
				placeholder="Reported for fraudulent campaign details."
				confirm="Suspend user"
				tone="danger"
				pending={suspend.isPending}
				onConfirm={(reason) =>
					suspending &&
					suspend.mutate(
						{ id: String(suspending.id), reason },
						{
							onSuccess: () => {
								toast.success("User suspended", { description: wallet(suspending) });
								setSuspending(null);
							},
							onError: (e) => toast.error("The user wasn't suspended", { description: errorMessage(e) }),
						},
					)
				}
			/>
		</>
	);
}
