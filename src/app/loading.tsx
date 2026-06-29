export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-amber-700 font-medium">Loading...</p>
      </div>
    </div>
  )
}
