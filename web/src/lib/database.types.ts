// Tipos gerados do banco. Não edite à mão: rode `npx supabase gen types typescript --local > web/src/lib/database.types.ts` na raiz.

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
                    "criado_em": string,"id": number,"numero": number,"publica": boolean,"titulo": string,"unidade_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"id"?: never,"numero": number,"publica"?: boolean,"titulo": string,"unidade_id": number
                  }
                  Update: {
                    "criado_em"?: string,"id"?: never,"numero"?: number,"publica"?: boolean,"titulo"?: string,"unidade_id"?: number
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
                },"perfis": {
                  Row: {
                    "criado_em": string,"email": string,"id": string,"nome": string,"papel": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"email": string,"id": string,"nome": string,"papel"?: string
                  }
                  Update: {
                    "criado_em"?: string,"email"?: string,"id"?: string,"nome"?: string,"papel"?: string
                  }
                  Relationships: [
                    
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
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "aprovar_todos":
{ Args: { "p_turma_disciplina_id": number }; Returns: number
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
      } }
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
