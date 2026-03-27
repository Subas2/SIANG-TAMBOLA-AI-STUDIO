import React from 'react';

const SkeletonElement: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-slate-700/50 rounded-md animate-pulse ${className}`} />
);

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
            {/* Quick Actions Skeleton */}
            <div className="bg-slate-800/60 p-4 rounded-xl">
                <SkeletonElement className="h-4 w-1/3 mb-4" />
                <div className="grid grid-cols-4 gap-2">
                    <SkeletonElement className="h-20" />
                    <SkeletonElement className="h-20" />
                    <SkeletonElement className="h-20" />
                    <SkeletonElement className="h-20" />
                    <SkeletonElement className="h-20" />
                    <SkeletonElement className="h-20" />
                    <SkeletonElement className="h-20" />
                    <SkeletonElement className="h-20" />
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="bg-slate-800/60 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                    <SkeletonElement className="h-6 w-1/2" />
                    <SkeletonElement className="h-8 w-1/4" />
                </div>
                <div className="flex justify-center my-4">
                    <SkeletonElement className="w-24 h-24 rounded-full" />
                </div>
                {/* Tambola Board Skeleton */}
                <div className="bg-slate-900/30 p-2 rounded-xl">
                    <div className="grid grid-cols-10 gap-1">
                        {Array.from({ length: 90 }).map((_, i) => (
                            <SkeletonElement key={i} className="aspect-square rounded-full" />
                        ))}
                    </div>
                </div>
                {/* Dividends Skeleton */}
                 <div className="mt-4">
                    <SkeletonElement className="h-6 w-1/2 mx-auto mb-4" />
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                         <SkeletonElement className="h-16" />
                         <SkeletonElement className="h-16" />
                         <SkeletonElement className="h-16" />
                         <SkeletonElement className="h-16" />
                     </div>
                </div>
            </div>
        </div>
    );
};
