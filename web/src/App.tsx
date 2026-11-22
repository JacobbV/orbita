import { Route, Routes } from 'react-router'
import { RotaProtegida } from './auth/RotaProtegida'
import { PublicLayout } from './components/Layout'
import { Starfield } from './components/Starfield'
import { Aguardando } from './pages/Aguardando'
import { Cadastro } from './pages/Cadastro'
import { Creditos } from './pages/Creditos'
import { EmBreve } from './pages/EmBreve'
import { Entrar } from './pages/Entrar'
import { Inicio } from './pages/Inicio'
import { NaoEncontrada } from './pages/NaoEncontrada'
import { NovaSenha } from './pages/NovaSenha'
import { Ponte } from './pages/Ponte'
import { RecuperarSenha } from './pages/RecuperarSenha'

export function App() {
  return (
    <>
      <Starfield />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Inicio />} />
          <Route path="creditos" element={<Creditos />} />
          <Route path="cadastro" element={<Cadastro />} />
          <Route path="entrar" element={<Entrar />} />
          <Route path="recuperar-senha" element={<RecuperarSenha />} />
          <Route path="nova-senha" element={<NovaSenha />} />
          <Route
            path="aguardando"
            element={
              <RotaProtegida papel="aluno">
                <Aguardando />
              </RotaProtegida>
            }
          />
          <Route
            path="ponte"
            element={
              <RotaProtegida papel="aluno">
                <Ponte />
              </RotaProtegida>
            }
          />
          {/* Próxima etapa: painel do professor (5) */}
          <Route
            path="professor"
            element={
              <RotaProtegida papel="professor">
                <EmBreve titulo="Painel do professor" />
              </RotaProtegida>
            }
          />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
    </>
  )
}
