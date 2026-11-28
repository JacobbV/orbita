
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "aulas": {
                  Row: {
                    "criado_em": string,"id": number,"numero": number,"publica": boolean,"titulo": string,"topicos": string[],"unidade_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"id"?: never,"numero": number,"publica"?: boolean,"titulo": string,"topicos"?: string[],"unidade_id": number
                  }
                  Update: {
                    "criado_em"?: string,"id"?: never,"numero"?: number,"publica"?: boolean,"titulo"?: string,"topicos"?: string[],"unidade_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "aulas_unidade_id_fkey"
      columns: ["unidade_id"]
isOneToOne: false
      referencedRelation: "unidades"
      referencedColumns: ["id"]
    }
                  ]
                },"avatares": {
                  Row: {
                    "atualizado_em": string,"escolhas": NonNullable<Json>,"escolhas_ninja": Json | null,"perfil_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"escolhas": NonNullable<Json>,"escolhas_ninja"?: Json | null,"perfil_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"escolhas"?: NonNullable<Json>,"escolhas_ninja"?: Json | null,"perfil_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "avatares_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: true
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"anotacoes_da_aula": {
                  Row: {
                    "atualizado_em": string,"aula_id": number,"texto": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"aula_id": number,"texto"?: string,"usuario_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"aula_id"?: number,"texto"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "anotacoes_da_aula_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "anotacoes_da_aula_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"aulas_abertas": {
                  Row: {
                    "aberta_em": string,"aluno_id": string,"aula_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "aberta_em"?: string,"aluno_id": string,"aula_id": number
                  }
                  Update: {
                    "aberta_em"?: string,"aluno_id"?: string,"aula_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "aulas_abertas_aluno_id_fkey"
      columns: ["aluno_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "aulas_abertas_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    }
                  ]
                },"dias_de_estudo": {
                  Row: {
                    "aluno_id": string,"dia": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aluno_id": string,"dia": string
                  }
                  Update: {
                    "aluno_id"?: string,"dia"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dias_de_estudo_aluno_id_fkey"
      columns: ["aluno_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"disciplinas": {
                  Row: {
                    "criado_em": string,"descricao": string,"id": number,"nome": string,"ordem": number,"publica": boolean,"sigla": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"descricao"?: string,"id"?: never,"nome": string,"ordem"?: number,"publica"?: boolean,"sigla": string
                  }
                  Update: {
                    "criado_em"?: string,"descricao"?: string,"id"?: never,"nome"?: string,"ordem"?: number,"publica"?: boolean,"sigla"?: string
                  }
                  Relationships: [
                    
                  ]
                },"entregas": {
                  Row: {
                    "aluno_id": string,"codigo": string,"comentario": string | null,"conferida_em": string | null,"corrigida_em": string | null,"criado_em": string,"devolvida_em": string | null,"exercicio_id": number,"id": number,"nota": number,"nota_professor": number | null,"situacao": string,"tentativa": number,"testes_certos": number,"testes_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "aluno_id": string,"codigo": string,"comentario"?: string | null,"conferida_em"?: string | null,"corrigida_em"?: string | null,"criado_em"?: string,"devolvida_em"?: string | null,"exercicio_id": number,"id"?: never,"nota": number,"nota_professor"?: number | null,"situacao"?: string,"tentativa": number,"testes_certos": number,"testes_total": number
                  }
                  Update: {
                    "aluno_id"?: string,"codigo"?: string,"comentario"?: string | null,"conferida_em"?: string | null,"corrigida_em"?: string | null,"criado_em"?: string,"devolvida_em"?: string | null,"exercicio_id"?: number,"id"?: never,"nota"?: number,"nota_professor"?: number | null,"situacao"?: string,"tentativa"?: number,"testes_certos"?: number,"testes_total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "entregas_aluno_id_fkey"
      columns: ["aluno_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entregas_exercicio_id_fkey"
      columns: ["exercicio_id"]
isOneToOne: false
      referencedRelation: "exercicios"
      referencedColumns: ["id"]
    }
                  ]
                },"exercicios": {
                  Row: {
                    "aula_id": number | null,"codigo_inicial": string,"conferencia": string,"criado_em": string,"dificuldade": number,"enunciado": string,"id": number,"linguagem": string,"ordem": number,"palavras_extras": string,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aula_id"?: number | null,"codigo_inicial"?: string,"conferencia"?: string,"criado_em"?: string,"dificuldade"?: number,"enunciado": string,"id"?: never,"linguagem"?: string,"ordem"?: number,"palavras_extras"?: string,"titulo": string
                  }
                  Update: {
                    "aula_id"?: number | null,"codigo_inicial"?: string,"conferencia"?: string,"criado_em"?: string,"dificuldade"?: number,"enunciado"?: string,"id"?: never,"linguagem"?: string,"ordem"?: number,"palavras_extras"?: string,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercicios_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    }
                  ]
                },"liberacoes": {
                  Row: {
                    "aula_id": number,"liberado_em": string,"liberado_por": string | null,"turma_disciplina_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "aula_id": number,"liberado_em"?: string,"liberado_por"?: string | null,"turma_disciplina_id": number
                  }
                  Update: {
                    "aula_id"?: number,"liberado_em"?: string,"liberado_por"?: string | null,"turma_disciplina_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "liberacoes_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "liberacoes_liberado_por_fkey"
      columns: ["liberado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "liberacoes_turma_disciplina_id_fkey"
      columns: ["turma_disciplina_id"]
isOneToOne: false
      referencedRelation: "turma_disciplinas"
      referencedColumns: ["id"]
    }
                  ]
                },"materiais": {
                  Row: {
                    "aula_id": number,"caminho_storage": string | null,"criado_em": string,"id": number,"ordem": number,"tipo": string,"titulo": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aula_id": number,"caminho_storage"?: string | null,"criado_em"?: string,"id"?: never,"ordem"?: number,"tipo"?: string,"titulo"?: string,"url"?: string | null
                  }
                  Update: {
                    "aula_id"?: number,"caminho_storage"?: string | null,"criado_em"?: string,"id"?: never,"ordem"?: number,"tipo"?: string,"titulo"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "materiais_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    }
                  ]
                },"matriculas": {
                  Row: {
                    "aluno_id": string,"criado_em": string,"decidido_em": string | null,"decidido_por": string | null,"disciplina_id": number,"id": number,"motivo_recusa": string | null,"quem_e_voce": string,"status": string,"tentativa": number,"turma_disciplina_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "aluno_id": string,"criado_em"?: string,"decidido_em"?: string | null,"decidido_por"?: string | null,"disciplina_id": number,"id"?: never,"motivo_recusa"?: string | null,"quem_e_voce": string,"status"?: string,"tentativa": number,"turma_disciplina_id": number
                  }
                  Update: {
                    "aluno_id"?: string,"criado_em"?: string,"decidido_em"?: string | null,"decidido_por"?: string | null,"disciplina_id"?: number,"id"?: never,"motivo_recusa"?: string | null,"quem_e_voce"?: string,"status"?: string,"tentativa"?: number,"turma_disciplina_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "matriculas_aluno_id_fkey"
      columns: ["aluno_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matriculas_decidido_por_fkey"
      columns: ["decidido_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matriculas_disciplina_id_fkey"
      columns: ["disciplina_id"]
isOneToOne: false
      referencedRelation: "disciplinas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matriculas_turma_disciplina_id_fkey"
      columns: ["turma_disciplina_id"]
isOneToOne: false
      referencedRelation: "turma_disciplinas"
      referencedColumns: ["id"]
    }
                  ]
                },"medalhas": {
                  Row: {
                    "codigo": string,"descricao": string,"nome": string,"ordem": number
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo": string,"descricao": string,"nome": string,"ordem"?: number
                  }
                  Update: {
                    "codigo"?: string,"descricao"?: string,"nome"?: string,"ordem"?: number
                  }
                  Relationships: [
                    
                  ]
                },"medalhas_ganhas": {
                  Row: {
                    "aluno_id": string,"ganha_em": string,"medalha": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aluno_id": string,"ganha_em"?: string,"medalha": string
                  }
                  Update: {
                    "aluno_id"?: string,"ganha_em"?: string,"medalha"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "medalhas_ganhas_aluno_id_fkey"
      columns: ["aluno_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "medalhas_ganhas_medalha_fkey"
      columns: ["medalha"]
isOneToOne: false
      referencedRelation: "medalhas"
      referencedColumns: ["codigo"]
    }
                  ]
                },"patentes": {
                  Row: {
                    "nivel": number,"nome": string,"xp_minimo": number
                  }
                  ComputedFields: never
                  Insert: {
                    "nivel": number,"nome": string,"xp_minimo": number
                  }
                  Update: {
                    "nivel"?: number,"nome"?: string,"xp_minimo"?: number
                  }
                  Relationships: [
                    
                  ]
                },"pecas": {
                  Row: {
                    "camada": string,"id": string,"nome": string,"ordem": number,"para": string,"xp_minimo": number
                  }
                  ComputedFields: never
                  Insert: {
                    "camada": string,"id": string,"nome": string,"ordem"?: number,"para"?: string,"xp_minimo"?: number
                  }
                  Update: {
                    "camada"?: string,"id"?: string,"nome"?: string,"ordem"?: number,"para"?: string,"xp_minimo"?: number
                  }
                  Relationships: [
                    
                  ]
                },"perfis": {
                  Row: {
                    "apelido": string | null,"criado_em": string,"email": string,"id": string,"nome": string,"papel": string
                  }
                  ComputedFields: never
                  Insert: {
                    "apelido"?: string | null,"criado_em"?: string,"email": string,"id": string,"nome": string,"papel"?: string
                  }
                  Update: {
                    "apelido"?: string | null,"criado_em"?: string,"email"?: string,"id"?: string,"nome"?: string,"papel"?: string
                  }
                  Relationships: [
                    
                  ]
                },"prova_questoes": {
                  Row: {
                    "exercicio_id": number,"id": number,"ordem": number,"peso": number,"prova_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "exercicio_id": number,"id"?: never,"ordem"?: number,"peso"?: number,"prova_id": number
                  }
                  Update: {
                    "exercicio_id"?: number,"id"?: never,"ordem"?: number,"peso"?: number,"prova_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "prova_questoes_exercicio_id_fkey"
      columns: ["exercicio_id"]
isOneToOne: false
      referencedRelation: "exercicios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prova_questoes_prova_id_fkey"
      columns: ["prova_id"]
isOneToOne: false
      referencedRelation: "provas"
      referencedColumns: ["id"]
    }
                  ]
                },"prova_respostas": {
                  Row: {
                    "codigo": string,"conferida_em": string | null,"id": number,"nota": number,"questao_id": number,"respondida_em": string,"respostas": number,"situacao": string,"tentativa_id": number,"testes_certos": number,"testes_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo": string,"conferida_em"?: string | null,"id"?: never,"nota": number,"questao_id": number,"respondida_em"?: string,"respostas"?: number,"situacao"?: string,"tentativa_id": number,"testes_certos": number,"testes_total": number
                  }
                  Update: {
                    "codigo"?: string,"conferida_em"?: string | null,"id"?: never,"nota"?: number,"questao_id"?: number,"respondida_em"?: string,"respostas"?: number,"situacao"?: string,"tentativa_id"?: number,"testes_certos"?: number,"testes_total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "prova_respostas_questao_id_fkey"
      columns: ["questao_id"]
isOneToOne: false
      referencedRelation: "prova_questoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prova_respostas_tentativa_id_fkey"
      columns: ["tentativa_id"]
isOneToOne: false
      referencedRelation: "prova_tentativas"
      referencedColumns: ["id"]
    }
                  ]
                },"prova_saidas": {
                  Row: {
                    "id": number,"saiu_em": string,"tentativa_id": number,"voltou_em": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"saiu_em"?: string,"tentativa_id": number,"voltou_em"?: string | null
                  }
                  Update: {
                    "id"?: never,"saiu_em"?: string,"tentativa_id"?: number,"voltou_em"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "prova_saidas_tentativa_id_fkey"
      columns: ["tentativa_id"]
isOneToOne: false
      referencedRelation: "prova_tentativas"
      referencedColumns: ["id"]
    }
                  ]
                },"prova_segunda_chamada": {
                  Row: {
                    "abre_em": string,"aluno_id": string,"criado_em": string,"fecha_em": string,"prova_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "abre_em": string,"aluno_id": string,"criado_em"?: string,"fecha_em": string,"prova_id": number
                  }
                  Update: {
                    "abre_em"?: string,"aluno_id"?: string,"criado_em"?: string,"fecha_em"?: string,"prova_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "prova_segunda_chamada_aluno_id_fkey"
      columns: ["aluno_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prova_segunda_chamada_prova_id_fkey"
      columns: ["prova_id"]
isOneToOne: false
      referencedRelation: "provas"
      referencedColumns: ["id"]
    }
                  ]
                },"prova_tentativas": {
                  Row: {
                    "aluno_id": string,"comecou_em": string,"encerrada_por": string | null,"entregue_em": string | null,"id": number,"prova_id": number,"saidas": number,"termina_em": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aluno_id": string,"comecou_em"?: string,"encerrada_por"?: string | null,"entregue_em"?: string | null,"id"?: never,"prova_id": number,"saidas"?: number,"termina_em": string
                  }
                  Update: {
                    "aluno_id"?: string,"comecou_em"?: string,"encerrada_por"?: string | null,"entregue_em"?: string | null,"id"?: never,"prova_id"?: number,"saidas"?: number,"termina_em"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "prova_tentativas_aluno_id_fkey"
      columns: ["aluno_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prova_tentativas_prova_id_fkey"
      columns: ["prova_id"]
isOneToOne: false
      referencedRelation: "provas"
      referencedColumns: ["id"]
    }
                  ]
                },"provas": {
                  Row: {
                    "abre_em": string,"criado_em": string,"duracao_min": number,"fecha_em": string,"id": number,"instrucoes": string,"notas_publicadas_em": string | null,"saidas_para_encerrar": number | null,"titulo": string,"turma_disciplina_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "abre_em": string,"criado_em"?: string,"duracao_min": number,"fecha_em": string,"id"?: never,"instrucoes"?: string,"notas_publicadas_em"?: string | null,"saidas_para_encerrar"?: number | null,"titulo": string,"turma_disciplina_id": number
                  }
                  Update: {
                    "abre_em"?: string,"criado_em"?: string,"duracao_min"?: number,"fecha_em"?: string,"id"?: never,"instrucoes"?: string,"notas_publicadas_em"?: string | null,"saidas_para_encerrar"?: number | null,"titulo"?: string,"turma_disciplina_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "provas_turma_disciplina_id_fkey"
      columns: ["turma_disciplina_id"]
isOneToOne: false
      referencedRelation: "turma_disciplinas"
      referencedColumns: ["id"]
    }
                  ]
                },"slides_do_usuario": {
                  Row: {
                    "atualizado_em": string,"marcador": number | null,"material_id": number,"rabiscos": Json,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"marcador"?: number | null,"material_id": number,"rabiscos"?: Json,"usuario_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"marcador"?: number | null,"material_id"?: number,"rabiscos"?: Json,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "slides_do_usuario_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materiais"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "slides_do_usuario_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"testes": {
                  Row: {
                    "entrada": string,"exercicio_id": number,"id": number,"ordem": number,"saida_esperada": string,"saida_hash": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "entrada"?: string,"exercicio_id": number,"id"?: never,"ordem"?: number,"saida_esperada": string,"saida_hash"?: never,"tipo": string
                  }
                  Update: {
                    "entrada"?: string,"exercicio_id"?: number,"id"?: never,"ordem"?: number,"saida_esperada"?: string,"saida_hash"?: never,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "testes_exercicio_id_fkey"
      columns: ["exercicio_id"]
isOneToOne: false
      referencedRelation: "exercicios"
      referencedColumns: ["id"]
    }
                  ]
                },"turma_disciplinas": {
                  Row: {
                    "disciplina_id": number,"id": number,"turma_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "disciplina_id": number,"id"?: never,"turma_id": number
                  }
                  Update: {
                    "disciplina_id"?: number,"id"?: never,"turma_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "turma_disciplinas_disciplina_id_fkey"
      columns: ["disciplina_id"]
isOneToOne: false
      referencedRelation: "disciplinas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "turma_disciplinas_turma_id_fkey"
      columns: ["turma_id"]
isOneToOne: false
      referencedRelation: "turmas"
      referencedColumns: ["id"]
    }
                  ]
                },"turmas": {
                  Row: {
                    "ano_letivo": number,"ativa": boolean,"criado_em": string,"id": number,"nome": string,"serie": number,"turno": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ano_letivo": number,"ativa"?: boolean,"criado_em"?: string,"id"?: never,"nome": string,"serie": number,"turno": string
                  }
                  Update: {
                    "ano_letivo"?: number,"ativa"?: boolean,"criado_em"?: string,"id"?: never,"nome"?: string,"serie"?: number,"turno"?: string
                  }
                  Relationships: [
                    
                  ]
                },"unidades": {
                  Row: {
                    "disciplina_id": number,"id": number,"numero": number,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "disciplina_id": number,"id"?: never,"numero": number,"titulo": string
                  }
                  Update: {
                    "disciplina_id"?: number,"id"?: never,"numero"?: number,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "unidades_disciplina_id_fkey"
      columns: ["disciplina_id"]
isOneToOne: false
      referencedRelation: "disciplinas"
      referencedColumns: ["id"]
    }
                  ]
                },"xp_eventos": {
                  Row: {
                    "aluno_id": string,"aula_id": number | null,"criado_em": string,"dado_por": string | null,"descricao": string,"exercicio_id": number | null,"id": number,"motivo": string,"quantidade": number,"referencia_dia": string | null,"situacao": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aluno_id": string,"aula_id"?: number | null,"criado_em"?: string,"dado_por"?: string | null,"descricao": string,"exercicio_id"?: number | null,"id"?: never,"motivo": string,"quantidade": number,"referencia_dia"?: string | null,"situacao"?: string
                  }
                  Update: {
                    "aluno_id"?: string,"aula_id"?: number | null,"criado_em"?: string,"dado_por"?: string | null,"descricao"?: string,"exercicio_id"?: number | null,"id"?: never,"motivo"?: string,"quantidade"?: number,"referencia_dia"?: string | null,"situacao"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "xp_eventos_aluno_id_fkey"
      columns: ["aluno_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "xp_eventos_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "xp_eventos_dado_por_fkey"
      columns: ["dado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "xp_eventos_exercicio_fk"
      columns: ["exercicio_id"]
isOneToOne: false
      referencedRelation: "exercicios"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "adicionar_aula":
{ Args: { "p_titulo": string,"p_unidade_id": number }; Returns: {
              "criado_em": string,
"id": number,
"numero": number,
"publica": boolean,
"titulo": string,
"unidade_id": number
            }
                          SetofOptions: {
        from: "*"
        to: "aulas"
        isOneToOne: true
        isSetofReturn: false
      } },
"adicionar_unidade":
{ Args: { "p_disciplina_id": number,"p_titulo": string }; Returns: {
              "disciplina_id": number,
"id": number,
"numero": number,
"titulo": string
            }
                          SetofOptions: {
        from: "*"
        to: "unidades"
        isOneToOne: true
        isSetofReturn: false
      } },
"apagar_apelido":
{ Args: { "p_perfil": string }; Returns: undefined
                           },
"aprovar_todos":
{ Args: { "p_turma_disciplina_id": number }; Returns: number
                           },
"comecar_prova":
{ Args: { "p_prova_id": number }; Returns: string
                           },
"conferir_entrega":
{ Args: { "p_confere": boolean,"p_entrega_id": number }; Returns: undefined
                           },
"conferir_resposta":
{ Args: { "p_confere": boolean,"p_resposta_id": number }; Returns: undefined
                           },
"corrigir_entrega":
{ Args: { "p_comentario": string,"p_entrega_id": number,"p_nota": number }; Returns: undefined
                           },
"dar_xp":
{ Args: { "p_aluno_id": string,"p_descricao": string,"p_quantidade": number }; Returns: undefined
                           },
"decidir_pedido":
{ Args: { "p_aprovar": boolean,"p_matricula_id": number,"p_motivo"?: string }; Returns: {
              "aluno_id": string,
"criado_em": string,
"decidido_em": string | null,
"decidido_por": string | null,
"disciplina_id": number,
"id": number,
"motivo_recusa": string | null,
"quem_e_voce": string,
"status": string,
"tentativa": number,
"turma_disciplina_id": number
            }
                          SetofOptions: {
        from: "*"
        to: "matriculas"
        isOneToOne: true
        isSetofReturn: false
      } },
"definir_link_da_aula":
{ Args: { "p_aula_id": number,"p_titulo"?: string,"p_url": string }; Returns: undefined
                           },
"definir_topicos_da_aula":
{ Args: { "p_aula_id": number,"p_topicos": string[] }; Returns: undefined
                           },
"definir_material_da_aula":
{ Args: { "p_aula_id": number,"p_tipo": string,"p_caminho": string,"p_titulo"?: string }; Returns: string
                           },
"remover_material_da_aula":
{ Args: { "p_aula_id": number,"p_tipo": string }; Returns: string
                           },
"registrar_audio_ouvido":
{ Args: { "p_aula_id": number }; Returns: Json
                           },
"definir_slides_da_aula":
{ Args: { "p_aula_id": number,"p_caminho": string,"p_titulo"?: string }; Returns: string
                           },
"devolver_entrega":
{ Args: { "p_comentario": string,"p_entrega_id": number }; Returns: undefined
                           },
"entregar":
{ Args: { "p_codigo": string,"p_exercicio_id": number,"p_testes_certos": number }; Returns: Json
                           },
"entregar_prova":
{ Args: { "p_prova_id": number }; Returns: undefined
                           },
"escolher_apelido":
{ Args: { "p_apelido": string }; Returns: string
                           },
"liberar_segunda_chamada":
{ Args: { "p_abre_em": string,"p_aluno_id": string,"p_fecha_em": string,"p_prova_id": number }; Returns: undefined
                           },
"liberar_unidade":
{ Args: { "p_liberar": boolean,"p_turma_disciplina_id": number,"p_unidade_id": number }; Returns: number
                           },
"meu_progresso":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"minhas_provas":
{ Args: Record<PropertyKey, never>; Returns: {
              "abre_em": string,"comecou_em": string,"duracao_min": number,"encerrada_por": string,"entregue_em": string,"fecha_em": string,"id": number,"instrucoes": string,"nota": number,"questoes": number,"saidas": number,"saidas_para_encerrar": number,"termina_em": string,"titulo": string,"turma_disciplina_id": number
            }[]
                           },
"pedir_acesso":
{ Args: { "p_quem_e_voce": string,"p_turma_disciplina_id": number }; Returns: {
              "aluno_id": string,
"criado_em": string,
"decidido_em": string | null,
"decidido_por": string | null,
"disciplina_id": number,
"id": number,
"motivo_recusa": string | null,
"quem_e_voce": string,
"status": string,
"tentativa": number,
"turma_disciplina_id": number
            }
                          SetofOptions: {
        from: "*"
        to: "matriculas"
        isOneToOne: true
        isSetofReturn: false
      } },
"professor_da_nave":
{ Args: Record<PropertyKey, never>; Returns: {
              "apelido": string,"escolhas": Json,"nome": string
            }[]
                           },
"publicar_notas":
{ Args: { "p_prova_id": number,"p_publicar": boolean }; Returns: undefined
                           },
"questoes_da_prova":
{ Args: { "p_prova_id": number }; Returns: {
              "codigo_inicial": string,"enunciado": string,"linguagem": string,"minha_resposta": string,"peso": number,"questao_id": number,"respondida_em": string,"testes": Json,"titulo": string
            }[]
                           },
"questoes_da_prova_ninja":
{ Args: { "p_prova_id": number }; Returns: {
              "codigo_inicial": string,"enunciado": string,"linguagem": string,"peso": number,"questao_id": number,"testes": Json,"titulo": string
            }[]
                           },
"registrar_abertura_da_aula":
{ Args: { "p_aula_id": number }; Returns: Json
                           },
"registrar_aula_aberta":
{ Args: { "p_aula_id": number }; Returns: undefined
                           },
"registrar_saida_da_prova":
{ Args: { "p_prova_id": number }; Returns: Json
                           },
"registrar_volta_da_prova":
{ Args: { "p_prova_id": number }; Returns: undefined
                           },
"remover_aula":
{ Args: { "p_aula_id": number }; Returns: undefined
                           },
"remover_exercicio":
{ Args: { "p_id": number }; Returns: undefined
                           },
"remover_prova":
{ Args: { "p_id": number }; Returns: undefined
                           },
"remover_slides_da_aula":
{ Args: { "p_aula_id": number }; Returns: string
                           },
"remover_unidade":
{ Args: { "p_unidade_id": number }; Returns: undefined
                           },
"responder_questao":
{ Args: { "p_codigo": string,"p_questao_id": number,"p_testes_certos": number }; Returns: string
                           },
"salvar_avatar":
{ Args: { "p_escolhas": Json }; Returns: undefined
                           },
"salvar_avatar_ninja":
{ Args: { "p_escolhas": Json }; Returns: undefined
                           },
"salvar_exercicio":
{ Args: { "p_aula_id": number,"p_codigo_inicial": string,"p_dificuldade": number,"p_enunciado": string,"p_id": number,"p_conferencia"?: string,"p_linguagem"?: string,"p_palavras_extras"?: string,"p_testes": Json,"p_titulo": string }; Returns: number
                           },
"salvar_prova":
{ Args: { "p_abre_em": string,"p_duracao_min": number,"p_fecha_em": string,"p_id": number,"p_instrucoes": string,"p_questoes": Json,"p_saidas_para_encerrar": number,"p_titulo": string,"p_turma_disciplina_id": number }; Returns: number
                           },
"situacao_da_prova":
{ Args: { "p_prova_id": number }; Returns: {
              "a_confirmar": number,"aluno_id": string,"apelido": string,"comecou_em": string,"encerrada_por": string,"entregue_em": string,"nome": string,"nota": number,"respondidas": number,"saidas": number,"segunda_chamada": boolean,"tentativa_id": number,"termina_em": string
            }[]
                           },
"sortear_apelido":
{ Args: { "p_evitar"?: string }; Returns: string
                           },
"sortear_apelido_do_aluno":
{ Args: { "p_perfil": string }; Returns: string
                           },
"testes_do_exercicio":
{ Args: { "p_exercicio_id": number }; Returns: {
              "conferencia": string,"entrada": string,"id": number,"palavras": string,"saida_esperada": string,"saida_hash": string,"tipo": string
            }[]
                           },
"xp_da_turma":
{ Args: { "p_turma_disciplina_id": number }; Returns: {
              "aluno_id": string,"apelido": string,"nome": string,"patente": string,"xp": number
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
