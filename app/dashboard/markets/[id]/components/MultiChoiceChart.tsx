// app/markets/[id]/components/MultiChoiceChart.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface PriceHistoryPoint {
  id: string;
  outcome_id: string;
  created_at: string;
  yes_price: number;
  volume?: number;
}

interface Outcome {
  id: string;
  title: string;
  yes_price: number;
  current_price?: number;
}

interface MultiChoiceChartProps {
  marketId: string;
  outcomes: Outcome[];
  className?: string;
}

// Polymarket-inspired color palette
const CHART_COLORS = [
  '#FF6B35', // Orange
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#A8DADC', // Light Blue
  '#F1FAEE', // Off White
  '#E63946', // Red
  '#457B9D', // Blue
  '#1D3557', // Dark Blue
];

type TimeRange = '1H' | '6H' | '1D' | '1W' | '1M' | 'ALL';

export function MultiChoiceChart({ marketId, outcomes, className = '' }: MultiChoiceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL')
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOutcomes, setSelectedOutcomes] = useState<Set<string>>(
    new Set(outcomes.map(o => o.id))
  )
  const supabase = createClient()

  const calculateStartDate = useCallback((range: TimeRange): Date => {
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '1H':
        startDate.setHours(now.getHours() - 1);
        break;
      case '6H':
        startDate.setHours(now.getHours() - 6);
        break;
      case '1D':
        startDate.setDate(now.getDate() - 1);
        break;
      case '1W':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'ALL':
        return new Date(0); // Beginning of time
    }
    return startDate;
  }, []);

  const loadChartData = useCallback(async (abortController?: AbortController) => {
    try {
      if (selectedOutcomes.size === 0) {
        setChartData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const startDate = calculateStartDate(timeRange);

      // Fetch price history for selected outcomes
      const priceHistoryPromises = Array.from(selectedOutcomes).map(async (outcomeId) => {
        let query = supabase
          .from('market_outcome_price_history')
          .select('*')
          .eq('outcome_id', outcomeId)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        const { data, error } = await query;

        if (error) throw error;

        const outcome = outcomes.find(o => o.id === outcomeId);
        return { outcomeId, data: data || [], outcome };
      });

      const allPriceHistory = await Promise.all(priceHistoryPromises);

      // Check if we should abort
      if (abortController?.signal.aborted) return;

      // Prepare chart data
      const labels: string[] = [];
      const datasets: any[] = [];

      allPriceHistory.forEach(({ outcomeId, data, outcome }, index) => {
        if (!data || data.length === 0) return;

        // Create labels from timestamps (only once)
        if (labels.length === 0) {
          labels.push(...data.map((point: PriceHistoryPoint) => {
            const date = new Date(point.created_at);
            if (timeRange === '1H' || timeRange === '6H') {
              return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              });
            } else if (timeRange === '1D') {
              return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                hour12: true 
              });
            } else {
              return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
              });
            }
          }));
        }

        const color = CHART_COLORS[index % CHART_COLORS.length];

        datasets.push({
          label: outcome?.title || `Outcome ${index + 1}`,
          data: data.map((point: PriceHistoryPoint) => 
            parseFloat((point.yes_price * 100).toFixed(1))
          ),
          borderColor: color,
          backgroundColor: `${color}20`,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          fill: false,
          volume: data.map((point: PriceHistoryPoint) => point.volume)
        });
      });

      setChartData({
        labels,
        datasets
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Error loading chart data:', err);
      setError('Failed to load chart data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [marketId, timeRange, selectedOutcomes, outcomes, supabase, calculateStartDate]);

  useEffect(() => {
    const abortController = new AbortController();
    loadChartData(abortController);

    return () => {
      abortController.abort();
    };
  }, [loadChartData]);

  const toggleOutcome = useCallback((outcomeId: string) => {
    setSelectedOutcomes(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(outcomeId)) {
        newSelected.delete(outcomeId);
      } else {
        newSelected.add(outcomeId);
      }
      return newSelected;
    });
  }, []);

  const getCurrentPrice = useCallback((outcomeId: string) => {
    const outcome = outcomes.find(o => o.id === outcomeId);
    return outcome ? (outcome.yes_price * 100).toFixed(1) : '0.0';
  }, [outcomes]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const volume = context.raw?.volume;
            return volume 
              ? `${label}: ${value}% (Vol: ${volume})`
              : `${label}: ${value}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: '#64748b',
          maxRotation: 0,
          autoSkipPadding: 20
        }
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: '#1e293b',
          drawBorder: false
        },
        ticks: {
          color: '#64748b',
          callback: function(value: any) {
            return value + '%';
          }
        }
      }
    }
  }), []);

  const timeRangeButtons: TimeRange[] = ['1H', '6H', '1D', '1W', '1M', 'ALL'];

  if (loading && !chartData) {
    return (
      <div className={`bg-[#0f1729] rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          {/* Legend skeleton */}
          <div className="flex flex-wrap gap-3 mb-6">
            {outcomes.map((_, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800">
                <div className="w-3 h-3 rounded-full bg-gray-700" />
                <div className="h-4 bg-gray-700 rounded w-16" />
                <div className="h-4 bg-gray-700 rounded w-8" />
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="h-64 bg-gray-800 rounded" />
          {/* Time range skeleton */}
          <div className="flex gap-2">
            {timeRangeButtons.map((_, index) => (
              <div key={index} className="h-8 bg-gray-700 rounded flex-1" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#0f1729] rounded-xl p-6 ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-center">
          {error}
          <button 
            onClick={() => loadChartData()}
            className="ml-2 underline hover:text-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* Legend - Outcome Selection */}
      <div className="flex flex-wrap gap-3 mb-6">
        {outcomes.map((outcome, index) => {
          const color = CHART_COLORS[index % CHART_COLORS.length];
          const isSelected = selectedOutcomes.has(outcome.id);
          const currentPrice = getCurrentPrice(outcome.id);
          
          return (
            <button
              key={outcome.id}
              onClick={() => toggleOutcome(outcome.id)}
              aria-label={`${isSelected ? 'Hide' : 'Show'} ${outcome.title} chart`}
              aria-pressed={isSelected}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border ${
                isSelected 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gray-900 border-gray-800 opacity-50 hover:opacity-70'
              } hover:border-gray-600`}
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: isSelected ? color : '#4b5563' }}
              />
              <span className="text-sm font-medium text-gray-200 whitespace-nowrap">
                {outcome.title}
              </span>
              <span className="text-sm font-semibold text-gray-300 whitespace-nowrap">
                {currentPrice}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="relative">
        {chartData && chartData.datasets.length > 0 ? (
          <div aria-label="Market price history chart" role="img">
            <Line data={chartData} options={chartOptions} />
          </div>
        ) : selectedOutcomes.size === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>Select at least one outcome to view chart</p>
            <button 
              onClick={() => setSelectedOutcomes(new Set(outcomes.map(o => o.id)))}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Show All Outcomes
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No data available for selected outcomes</p>
            <p className="text-sm text-gray-500">Try selecting different outcomes or time range</p>
          </div>
        )}
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-800">
        {timeRangeButtons.map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 sm:flex-none ${
              timeRange === range
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {range}
          </button>
        ))}
        
        {/* Revvyo Logo */}
        <div className="ml-auto flex items-center gap-2 text-gray-500">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v10c0 5.5 3.8 10.7 10 12 6.2-1.3 10-6.5 10-12V7l-10-5z"/>
          </svg>
          <span className="text-xs font-medium hidden sm:inline">Revvyo Trade</span>
        </div>
      </div>
    </div>
  );
}