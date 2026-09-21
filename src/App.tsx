import { Route, Routes } from 'react-router-dom'

import PublicLayout from './components/PublicLayout'
import HomePage from './pages/public/HomePage'
import ProjectsPage from './pages/public/ProjectsPage'
import ServicesPage from './pages/public/ServicesPage'
import InsightPage from './pages/public/InsightPage'
import AboutPage from './pages/public/AboutPage'
import ContactPage from './pages/public/ContactPage'
import StudioLayout from './pages/studio/StudioLayout'
import PublishingPage from './pages/studio/PublishingPage'
import StudioProjectsPage from './pages/studio/StudioProjectsPage'
import StudioArticlesPage from './pages/studio/StudioArticlesPage'
import StudioServicesPage from './pages/studio/StudioServicesPage'
import StudioSettingsPage from './pages/studio/StudioSettingsPage'

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="prosjekter" element={<ProjectsPage />} />
        <Route path="tjenester" element={<ServicesPage />} />
        <Route path="innsikt" element={<InsightPage />} />
        <Route path="om-oss" element={<AboutPage />} />
        <Route path="kontakt" element={<ContactPage />} />
      </Route>
      <Route path="studio" element={<StudioLayout />}>
        <Route index element={null} />
        <Route path="publisering" element={<PublishingPage />} />
        <Route path="prosjekter" element={<StudioProjectsPage />} />
        <Route path="artikler" element={<StudioArticlesPage />} />
        <Route path="tjenester" element={<StudioServicesPage />} />
        <Route path="innstillinger" element={<StudioSettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
