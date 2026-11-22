import { Route, Routes } from 'react-router'
import { PublicLayout } from './components/Layout'
import { Starfield } from './components/Starfield'
import { Creditos } from './pages/Creditos'
import { EmBreve } from './pages/EmBreve'
import { Inicio } from './pages/Inicio'
import { NaoEncontrada } from './pages/NaoEncontrada'

export function App() {
  return (
    <>
      <Starfield />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Inicio />} />
          <Route path="creditos" element={<Creditos />} />
          <Route path="entrar" element={<EmBreve titulo="Entrar" />} />
          <Route path="cadastro" element={<EmBreve titulo="Criar conta" />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
    </>
  )
}
