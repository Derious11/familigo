import React from 'react';

interface WeightEntry {
    value: number;
    timestamp: Date;
}

interface WeightChartProps {
    data?: WeightEntry[];
    unit?: 'lbs' | 'kg';
}

const WeightChart: React.FC<WeightChartProps> = ({ data = [], unit = 'lbs' }) => {
    // We need at least two data points to draw a line.
    if (!data || data.length < 2) {
        return (
            <div className="mt-6 text-center bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                <p className="text-sm text-brand-text-secondary dark:text-gray-400">
                    Log your weight more than once to see your progress chart.
                </p>
            </div>
        );
    }

    // Sort data by timestamp and take the last 7 entries
    const sortedData = [...data]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(-7);

    const chartHeight = 200;
    const chartWidth = 500; // Using a fixed aspect ratio, SVG viewBox will handle scaling.
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };

    const values = sortedData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const yRange = maxValue - minValue;

    // Add some padding to the y-axis so points aren't on the edge
    const yMin = yRange > 0 ? Math.floor(minValue - yRange * 0.1) : Math.floor(minValue - 5);
    const yMax = yRange > 0 ? Math.ceil(maxValue + yRange * 0.1) : Math.ceil(maxValue + 5);

    const xScale = (index: number) => {
        if (sortedData.length === 1) {
            return padding.left + (chartWidth - padding.left - padding.right) / 2;
        }
        return padding.left + (index / (sortedData.length - 1)) * (chartWidth - padding.left - padding.right);
    };

    const yScale = (value: number) => {
        if (yMax === yMin) { // Avoid division by zero if all values are the same
            return chartHeight - padding.bottom - (chartHeight - padding.top - padding.bottom) / 2;
        }
        return chartHeight - padding.bottom - ((value - yMin) / (yMax - yMin)) * (chartHeight - padding.top - padding.bottom);
    };
    
    const pathData = sortedData
        .map((point, i) => {
            const x = xScale(i);
            const y = yScale(point.value);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        })
        .join(' ');
        
    const formatDate = (date: Date) => {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    
    // Generate Y-axis labels
    const yAxisLabels = [];
    const numLabels = 5;
    const step = (yMax - yMin) / (numLabels - 1);
    for (let i = 0; i < numLabels; i++) {
        const value = Math.round((yMin + i * step) * 10) / 10; // Round to one decimal place
        if (yMax !== yMin) { // Only add labels if there's a range
            yAxisLabels.push({ value, y: yScale(value) });
        }
    }
    if (yAxisLabels.length === 0 && yMax === yMin) { // Handle case where all values are the same
         yAxisLabels.push({ value: yMin, y: yScale(yMin) });
    }


    return (
        <div className="mt-6">
            <h4 className="text-lg font-semibold text-brand-text-primary dark:text-gray-100 mb-2">Weight Journey</h4>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto" aria-labelledby="chart-title" role="img">
                    <title id="chart-title">A line chart showing weight progress over time.</title>
                    
                    {/* Y-axis grid lines and labels */}
                    {yAxisLabels.map(({ value, y }) => (
                         <g key={value} className="text-xs text-gray-400 dark:text-gray-500">
                             <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
                            <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="currentColor">
                                {value}
                            </text>
                        </g>
                    ))}

                    {/* X-axis labels */}
                     {sortedData.map((point, i) => (
                        <text key={i} x={xScale(i)} y={chartHeight - padding.bottom + 15} textAnchor="middle" className="text-xs fill-current text-gray-500 dark:text-gray-400">
                            {formatDate(point.timestamp)}
                        </text>
                    ))}

                    {/* Line path */}
                    {sortedData.length > 1 && <path d={pathData} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

                    {/* Data points and tooltips */}
                    {sortedData.map((point, i) => (
                        <g key={i} className="group">
                             <circle cx={xScale(i)} cy={yScale(point.value)} r="4" fill="#3B82F6" className="cursor-pointer" />
                            <circle cx={xScale(i)} cy={yScale(point.value)} r="8" fill="#3B82F6" fillOpacity="0.2" className="cursor-pointer transition-opacity opacity-0 group-hover:opacity-100" />
                            {/* Tooltip */}
                            <g className="transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none">
                                <rect x={xScale(i) - 35} y={yScale(point.value) - 40} width="70" height="30" rx="4" fill="black" fillOpacity="0.75" />
                                <text x={xScale(i)} y={yScale(point.value) - 28} textAnchor="middle" className="text-xs font-bold fill-current text-white">{`${point.value} ${unit}`}</text>
                                <text x={xScale(i)} y={yScale(point.value) - 16} textAnchor="middle" className="text-xs fill-current text-white">{formatDate(point.timestamp)}</text>
                             </g>
                        </g>
                    ))}

                </svg>
            </div>
        </div>
    );
};

export default WeightChart;
