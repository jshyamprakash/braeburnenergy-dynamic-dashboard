'use client';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Create Dashboard
        </button>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Dashboard Components Coming Soon
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Real-time visualization components will be added in Sprint 2.2
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Gauge Block
                </h4>
                <p className="text-xs text-gray-500">
                  Circular gauge for single metrics
                </p>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Time-Series Chart
                </h4>
                <p className="text-xs text-gray-500">
                  Line charts with historical data
                </p>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Live Stream
                </h4>
                <p className="text-xs text-gray-500">
                  Real-time data via WebSocket
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
