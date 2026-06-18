import { Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { AgentPage } from './pages/AgentPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { BatchAnalysisPage } from './pages/BatchAnalysisPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<AgentPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/batch" element={<BatchAnalysisPage />} />
        <Route path="/tasks" element={<TasksPage />} />
      </Route>
    </Routes>
  );
}
