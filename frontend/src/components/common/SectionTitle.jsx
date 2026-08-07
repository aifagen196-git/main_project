export default function SectionTitle({
  title,
  sub,
  action,
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">
          {title}
        </h3>

        {sub && (
          <p className="text-sm text-slate-500 mt-0.5">
            {sub}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}