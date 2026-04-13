export default function DashboardLoading() {
  return (
    <div className="flex flex-col flex-1 min-h-screen" style={{ backgroundColor: "var(--color-bg-page)" }}>
      {/* Topbar skeleton */}
      <div
        className="px-4 sm:px-6 lg:px-8 py-5 max-w-[1280px] mx-auto w-full"
        style={{ borderBottom: "1px solid rgba(199,196,215,0.2)" }}
      >
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div
              className="h-7 w-52 rounded-lg animate-pulse"
              style={{ backgroundColor: "#eae7ee" }}
            />
            <div
              className="h-4 w-36 rounded-lg animate-pulse"
              style={{ backgroundColor: "#eae7ee" }}
            />
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full animate-pulse"
              style={{ backgroundColor: "#eae7ee" }}
            />
            <div
              className="h-9 w-28 rounded-full animate-pulse"
              style={{ backgroundColor: "#eae7ee" }}
            />
          </div>
        </div>
      </div>

      {/* KPI grid skeleton */}
      <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-[1280px] mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 animate-pulse"
              style={{
                backgroundColor: "var(--color-bg-card)",
                boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
              }}
            >
              <div
                className="h-4 w-24 rounded mb-4"
                style={{ backgroundColor: "#eae7ee" }}
              />
              <div
                className="h-8 w-20 rounded mb-2"
                style={{ backgroundColor: "#eae7ee" }}
              />
              <div
                className="h-3 w-16 rounded"
                style={{ backgroundColor: "#eae7ee" }}
              />
            </div>
          ))}
        </div>

        {/* Content area skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div
            className="lg:col-span-7 rounded-2xl animate-pulse"
            style={{
              backgroundColor: "var(--color-bg-card)",
              height: 420,
              boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
            }}
          />
          <div className="lg:col-span-5 space-y-4">
            <div
              className="rounded-2xl animate-pulse"
              style={{
                backgroundColor: "var(--color-bg-card)",
                height: 200,
                boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
              }}
            />
            <div
              className="rounded-2xl animate-pulse"
              style={{
                backgroundColor: "var(--color-bg-card)",
                height: 200,
                boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
