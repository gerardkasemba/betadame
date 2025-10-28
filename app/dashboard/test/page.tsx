// app/admin/discover-endpoints/page.tsx
'use client'

import { useState } from 'react'

export default function DiscoverEndpointsPage() {
  const [sport, setSport] = useState('baseball')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')

  const discoverEndpoints = async () => {
    setLoading(true)
    setResults(null)
    setError('')

    try {
      const response = await fetch(`/api/sports/debug-endpoints?sport=${sport}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }
      
      setResults(data)
    } catch (err: any) {
      setError(err.message)
      console.error('Discovery error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Safe data access functions
  const getSummary = () => {
    if (!results?.summary) {
      return {
        totalTested: results?.allResults?.length || 0,
        working: results?.workingEndpoints?.length || 0,
        notFound: results?.allResults?.filter((r: any) => r.status === 'endpoint_not_found')?.length || 0
      }
    }
    return results.summary
  }

  const getWorkingEndpoints = () => {
    return results?.workingEndpoints || []
  }

  const getAllResults = () => {
    return results?.allResults || []
  }

  const getSport = () => {
    return results?.sport || sport
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Discover API Endpoints</h1>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sport
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="baseball">Baseball</option>
                <option value="basketball">Basketball</option>
                <option value="football">Football</option>
                <option value="soccer">Soccer</option>
                <option value="tennis">Tennis</option>
                <option value="hockey">Hockey</option>
              </select>
            </div>
            
            <button
              onClick={discoverEndpoints}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Discovering...' : 'Discover Endpoints'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Discovery Summary for: <span className="text-blue-600">{getSport()}</span>
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{getSummary().totalTested}</div>
                  <div className="text-sm text-blue-700">Endpoints Tested</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{getSummary().working}</div>
                  <div className="text-sm text-green-700">Working Endpoints</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{getSummary().notFound}</div>
                  <div className="text-sm text-red-700">Not Found</div>
                </div>
              </div>
            </div>

            {/* Working Endpoints */}
            {getWorkingEndpoints().length > 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                  ✅ {getWorkingEndpoints().length} Working Endpoint(s) Found!
                </h3>
                {getWorkingEndpoints().map((endpoint: any, index: number) => (
                  <div key={index} className="mb-6 last:mb-0 p-4 bg-green-100 rounded-lg">
                    <div className="font-mono text-sm bg-green-200 px-3 py-2 rounded mb-3">
                      {endpoint.endpoint}
                    </div>
                    <div className="text-sm text-green-800 mb-2">
                      <strong>Data Keys:</strong> {endpoint.dataKeys?.join(', ') || 'No keys found'}
                    </div>
                    <div className="text-sm text-green-700 mb-2">
                      <strong>Content Type:</strong> {endpoint.contentType}
                    </div>
                    {endpoint.sampleData && (
                      <div className="mt-3">
                        <details className="cursor-pointer">
                          <summary className="text-green-700 font-medium text-sm">
                            View Sample Data ▼
                          </summary>
                          <pre className="bg-white p-3 rounded border text-xs overflow-x-auto mt-2 max-h-60 overflow-y-auto">
                            {JSON.stringify(endpoint.sampleData, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  ⚠️ No Working Endpoints Found
                </h3>
                <p className="text-yellow-700">
                  The API might require different endpoint patterns or authentication.
                </p>
              </div>
            )}

            {/* All Results */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                All Tested Endpoints ({getAllResults().length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getAllResults().map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                    <div className="font-mono text-sm flex-1">{result.endpoint}</div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium min-w-20 text-center ${
                      result.status === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                      result.status === 'endpoint_not_found' ? 'bg-red-100 text-red-800 border border-red-200' :
                      result.status === 'http_error' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                      'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {result.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Next Steps</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <h4 className="font-medium mb-2">If endpoints are working:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Update the main fetch function with working endpoints</li>
                    <li>Check the sample data structure</li>
                    <li>Adjust data processing accordingly</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">If no endpoints work:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check RapidAPI documentation</li>
                    <li>Verify your API key permissions</li>
                    <li>Try different endpoint patterns</li>
                    <li>Use mock data for development</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white border rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Testing API endpoints...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
          </div>
        )}
      </div>
    </div>
  )
}