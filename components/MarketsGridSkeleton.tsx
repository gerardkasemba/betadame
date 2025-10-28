// app/sports/components/MarketsGridSkeleton.tsx
export default function MarketsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full">
            {/* Title Skeleton */}
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-4/5 mb-4" />
            
            {/* Teams Skeleton */}
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16" />
              </div>
              <div className="w-6 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
              <div className="flex items-center space-x-3">
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16" />
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
            </div>

            {/* Outcomes Skeleton */}
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2" />
              {[...Array(2)].map((_, j) => (
                <div key={j} className="flex justify-between items-center">
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20" />
                  <div className="flex space-x-4">
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12" />
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12" />
                  </div>
                </div>
              ))}
            </div>

            {/* Info Skeleton */}
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
            </div>

            {/* Prices Skeleton */}
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex justify-between items-center">
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-8" />
                  <div className="text-right">
                    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-12 mb-1" />
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-8" />
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Skeleton */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex space-x-4">
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16" />
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12" />
              </div>
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-16" />
            </div>

            {/* CTA Skeleton */}
            <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <div className="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}