export default function Bar({
  value,
  color = "bg-brand",
  track = "bg-slate-100",
}) {
  return (
    <div className={"h-2 w-full rounded-full overflow-hidden " + track}>
      <div
        className={"h-full rounded-full " + color}
        style={{
          width: value + "%",
          transition: "width 1s ease",
        }}
      />
    </div>
  );
}