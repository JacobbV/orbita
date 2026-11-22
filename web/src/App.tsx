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
          {/* Próximas etapas: ponte do aluno (4) e painel do professor (5) */}
          <Route
            path="ponte"
            element={
              <RotaProtegida papel="aluno">
                <EmBreve titulo="Ponte de comando" />
              </RotaProtegida>
            }
          />
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
