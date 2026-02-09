import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            IoT Platform Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Enterprise IoT Platform - Device Management & Real-Time Monitoring
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                Week 1: Backend
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-400">✓ Complete</p>
              <ul className="mt-2 text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <li>• Monorepo setup</li>
                <li>• Database & TimescaleDB</li>
                <li>• API & WebSocket</li>
                <li>• Swagger docs</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-900 dark:text-green-300 mb-1">
                Week 2: Frontend
              </h3>
              <p className="text-xs text-green-700 dark:text-green-400">⚡ In Progress</p>
              <ul className="mt-2 text-xs text-green-600 dark:text-green-400 space-y-1">
                <li>• Next.js 16 setup</li>
                <li>• API client & hooks</li>
                <li>• WebSocket integration</li>
                <li>• Dashboard components</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Week 3: Testing
              </h3>
              <p className="text-xs text-gray-700 dark:text-gray-300">⏳ Upcoming</p>
              <ul className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• End-to-end tests</li>
                <li>• Load testing</li>
                <li>• Documentation</li>
                <li>• Deployment prep</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Link
          href="/devices"
          className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Device Management
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create, view, and manage IoT devices. Monitor device states and view time-series data.
          </p>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            View Devices →
          </span>
        </Link>

        <Link
          href="/dashboard"
          className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Real-Time Dashboard
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Interactive dashboards with gauges, charts, and live data visualization.
          </p>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            View Dashboard →
          </span>
        </Link>
      </div>
    </div>
  );
}
