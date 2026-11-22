import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { RotaProtegida } from './auth/RotaProtegida'
import { PublicLayout } from './components/Layout'
import { Carregando } from './components/Carregando'
import { Starfield } from './components/Starfield'
import { Aguardando } from './pages/Aguardando'
import { Cadastro } from './pages/Cadastro'
import { Creditos } from './pages/Creditos'
import { Entrar } from './pages/Entrar'
import { Hangar } from './pages/Hangar'
import { Inicio } from './pages/Inicio'
import { NaoEncontrada } from './pages/NaoEncontrada'
import { NovaSenha } from './pages/NovaSenha'
import { Ponte } from './pages/Ponte'
import { Professor } from './pages/professor/Professor'
import { VerComoAluno } from './pages/professor/VerComoAluno'
import { XpDaTurma } from './pages/professor/XpDaTurma'
import { RecuperarSenha } from './pages/RecuperarSenha'
import { Slides } from './pages/Slides'

// O laboratório (editor e Python) só baixa quando alguém abre um exercício.
const Exercicio = lazy(() => import('./pages/Exercicio').then((m) => ({ default: m.Exercicio })))

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
          <Route
            path="professor"
            element={
              <RotaProtegida papel="professor">
                <Professor />
              </RotaProtegida>
            }
          />
          <Route
            path="professor/ver-como-aluno/:ofertaId"
            element={
              <RotaProtegida papel="professor">
                <VerComoAluno />
              </RotaProtegida>
            }
          />
          <Route
            path="professor/xp/:ofertaId"
            element={
              <RotaProtegida papel="professor">
                <XpDaTurma />
              </RotaProtegida>
            }
          />
          <Route
            path="hangar"
            element={
              <RotaProtegida>
                <Hangar />
              </RotaProtegida>
            }
          />
          <Route
            path="exercicio/:id"
            element={
              <RotaProtegida>
                <Suspense fallback={<Carregando />}>
                  <Exercicio />
                </Suspense>
              </RotaProtegida>
            }
          />
          <Route
            path="slides/:id"
            element={
              <RotaProtegida>
                <Slides />
              </RotaProtegida>
            }
          />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
    </>
  )
}
