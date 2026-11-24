import { DetailRow } from "@repo/ui/surface";
import type { AdminRecord } from "@/lib/api/dto";
import { humanize, Value } from "@/features/admin/values";

const isRecord = (v: unknown): v is AdminRecord => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Every field of an admin record as label / value rows; nested objects and lists of objects (integrity checks, …)
 * as grouped blocks. The admin response shapes are provisional, so detail views show the record in full rather than a
 * fixed set of fields.
 */
export function RecordView({ record, path = "" }: { record: AdminRecord; path?: string }) {
	return (
		<dl className="flex flex-col gap-2.5">
			{Object.entries(record).map(([key, value]) => {
				const name = path ? `${path}.${key}` : key;
				if (isRecord(value))
					return (
						<div key={name} className="flex flex-col gap-2 rounded-control bg-page p-3">
							<dt className="label">{humanize(key)}</dt>
							<dd>
								<RecordView record={value} path={name} />
							</dd>
						</div>
					);
				if (Array.isArray(value) && value.length > 0 && value.every(isRecord))
					return (
						<div key={name} className="flex flex-col gap-2">
							<dt className="label">{humanize(key)}</dt>
							<dd className="flex flex-col gap-2">
								{value.map((item, i) => (
									<div key={`${name}.${i}`} className="rounded-control bg-page p-3">
										<RecordView record={item} path={name} />
									</div>
								))}
							</dd>
						</div>
					);
				return <DetailRow key={name} label={humanize(key)} value={<Value name={name} value={value} />} />;
			})}
		</dl>
	);
}
