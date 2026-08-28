import ZAI from 'z-ai-web-dev-sdk'
import * as fs from 'fs'
import * as path from 'path'

interface Q {
  statement: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  explanation: string
  difficulty: 'EASY' | 'MEDIUM'
  subjectName: string
}

// Distribution: topic -> { total, easy }
// Total = 300 (150 EASY + 150 MEDIUM)
const TOPIC_PLAN: { subject: string; total: number; easy: number; hint: string }[] = [
  { subject: 'Introdução ao PCM', total: 10, easy: 5, hint: 'Definição de PCM (metodologia sistemática que organiza e otimiza a manutenção), três pilares (Planejamento, Programação, Controle), contexto histórico da manutenção (Corretiva até 1950 → Preventiva 1960-1980 → Preditiva 1990-2010 → 4.0 a partir de 2020), papel do profissional de PCM, Indústria 4.0 (IoT, IA, Big Data) e 5.0 (centralidade humana, sustentabilidade).' },
  { subject: 'Planejamento da Manutenção (PCM)', total: 12, easy: 6, hint: 'Etapas do planejamento (definição de escopo, recursos humanos, materiais, documentação), programação (agendamento, alocação de equipes, prazos, coordenação com produção), controle (acompanhamento de KPIs, análise de desvios, ações corretivas, ciclo PDCA), processos-chave, softwares CMMS, desafios (resistência cultural, integração).' },
  { subject: 'Manutenção Preventiva', total: 12, easy: 6, hint: 'Definição: intervenções programadas baseadas em tempo ou uso para reduzir falhas. Características: inspeções rotineiras, lubrificação, ajustes, calibrações, substituição planejada. Vantagens: redução de paradas, padronização. Desvantagens: possível manutenção excessiva. Lubrificação, inspeção, plano de manutenção preventiva (PMP).' },
  { subject: 'Manutenção Preditiva', total: 10, easy: 5, hint: 'Definição: manutenção baseada em condição, monitora equipamento em operação. Técnicas: análise de vibração, termografia infravermelha, ultrassom, análise de óleo, análise de corrente elétrica (MCSA). Detecção precoce. Reduz custo vs preventiva excessiva. Exige investimento inicial.' },
  { subject: 'Manutenção Corretiva', total: 10, easy: 5, hint: 'Definição: intervenção após a falha. Tipos: corretiva não planejada (emergencial) e planejada (quando há redundância). "Só conserto quando quebra". Alto custo, longas paradas, ideal para itens não críticos com baixo impacto. Quando não vale a pena prevenir.' },
  { subject: 'Manutenção Autônoma', total: 10, easy: 5, hint: 'Pilar do TPM. Operadores executam limpeza, inspeção, lubrificação (LIL) e pequenos ajustes. Padronização (padrões operacionais). Passagem da gestão do especialista para o operador. Treinamento. Etapas: limpeza inicial, eliminação de fontes de contaminação, padrões provisórios, treinamento, inspeção autônoma.' },
  { subject: 'TPM - Manutenção Produtiva Total', total: 12, easy: 6, hint: 'Total Productive Maintenance. 8 pilares: 1) Manutenção Autônoma, 2) Manutenção Planejada, 3) Melhorias Específicas (Kaizen), 4) Manutenção da Qualidade, 5) Educação e Treinamento, 6) Segurança, Higiene e Meio Ambiente, 7) Controle Administrativo (escritório), 8) Gerenciamento de Equipamentos Novos. Meta: zero falhas, zero acidentes. OEE como métrica. Conceito de "meu equipamento, eu cuido".' },
  { subject: 'Falha, Defeito e Pane', total: 10, easy: 5, hint: 'Conceitos NBR 5462: FALHA = fim da capacidade de um item desempenhar a função requerida. DEFEITO = estado que degrada mas não impede a função (pode evoluir para falha). PANE = estado do item após falha. Falha potencial, modo de falha (forma como a falha ocorre), mecanismo de falha (processo físico), causa de falha, falha por mau uso, falha catastrófica.' },
  { subject: 'NBR 5462', total: 10, easy: 5, hint: 'ABNT NBR 5462/1994 - Confiabilidade e Mantenabilidade - Terminologia. Definições de: item, item reparado/não-reparado, função requerida, eficácia, disponibilidade, mantenabilidade (probabilidade de realizar manutenção em tempo dado), confiabilidade (probabilidade de desempenhar função em condições por período), MTBF, MTTR, defeito, falha, pane.' },
  { subject: 'Curva da Banheira', total: 8, easy: 4, hint: 'Curva de taxa de falha vs tempo. 3 regiões: 1) MORTALIDADE INFANTIL (taxa decrescente, falhas iniciais por defeito de fabricação/instalação); 2) VIDA ÚTIL (taxa constante, falhas aleatórias, mais baixa); 3) DESGASTE (taxa crescente, falhas por envelhecimento). Aplicações: preventiva ideal na região de desgaste, não na vida útil.' },
  { subject: 'OEE', total: 10, easy: 5, hint: 'Overall Equipment Effectiveness = Disponibilidade × Performance × Qualidade. Mundo classe: ≥85%. Disponibilidade = tempo operação/tempo programado; Performance = velocidade real/ideal; Qualidade = peças boas/total. Indicador central do TPM. Calculado em %.' },
  { subject: 'Matriz de Criticidade', total: 8, easy: 4, hint: 'Matriz risco = Severidade (impacto) × Frequência (probabilidade). Classes: Crítico (alto impacto + alta frequência), Importante, Não crítico. Aplicação: priorizar ativos para programa de manutenção, definir estratégia (RCM, PdM, etc).' },
  { subject: 'Princípio de Pareto', total: 8, easy: 4, hint: 'Regra 80/20: 80% dos efeitos vêm de 20% das causas (Princípio de Pareto, economista italiano). Aplicações em PCM: 80% das falhas vêm de 20% dos equipamentos; priorizar esforços nos poucos vitais. Diagrama de barras + linha acumulada.' },
  { subject: '5W2H', total: 8, easy: 4, hint: 'Ferramenta de plano de ação: What (o que), Why (por que), Where (onde), When (quando), Who (quem), How (como), How much (quanto custa). Aplicação em PCM: estruturação de planos de manutenção, resolução de problemas, projetos.' },
  { subject: 'Diagrama de Ishikawa', total: 10, easy: 5, hint: 'Diagrama de causa-efeito (espinha de peixe), criado por Kaoru Ishikawa. 6Ms: Método, Máquina, Material, Mão de obra, Medida, Meio ambiente. Análise estruturada de causa raiz por categoria. Brainstorming + classificação.' },
  { subject: 'PERT & CPM', total: 8, easy: 4, hint: 'PERT = Program Evaluation and Review Technique (probabilístico, 3 tempos: otimista, provável, pessimista). CPM = Critical Path Method (determinístico, tempo fixo). Ambos usam redes de atividades com nós e setas, eventos, atividades fictícias.' },
  { subject: 'CPM - Caminho Crítico', total: 10, easy: 5, hint: 'Caminho mais longo em rede PERT/CPM; define duração mínima do projeto. Atividades críticas têm folga zero. Folga total = atraso máx sem afetar projeto. Folga livre = atraso máx sem afetar atividade sucessora. Aplicações em paradas industriais.' },
  { subject: 'FTA - Árvore de Falhas', total: 8, easy: 4, hint: 'Fault Tree Analysis. Análise dedutiva top-down: parte do evento topo (falha indesejada) e identifica combinações lógicas (AND, OR) de eventos que o causam. Análise qualitativa (corte mínimo) e quantitativa (probabilidade).' },
  { subject: 'Kaizen - Melhoria Contínua', total: 8, easy: 4, hint: 'Filosofia japonesa: Kai (mudança) + Zen (bom) = melhoria contínua em pequenos passos. Envolvimento de todos os níveis. Ciclo PDCA. Gemba (local onde acontece), Gemba Walk, Genchi Genbutsu. Diferença de inovação (ruptura).' },
  { subject: 'MTTR', total: 12, easy: 6, hint: 'Mean Time To Repair = Tempo Total de Reparo ÷ Número de Falhas. Mede eficiência da manutenção (manutenibilidade). Inclui diagnóstico + reparo + teste. Quanto menor melhor. Aplicação: avaliar equipe, gestão de estoque de peças, SLA. Unidade: horas.' },
  { subject: 'MTBF', total: 12, easy: 6, hint: 'Mean Time Between Failures = Tempo Total de Operação ÷ Número de Falhas. Mede confiabilidade do equipamento. Quanto maior melhor. Exclui paradas programadas. Base para plano de preventiva. Unidade: horas. Disponibilidade = MTBF/(MTBF+MTTR).' },
  { subject: 'FMEA', total: 12, easy: 6, hint: 'Failure Mode and Effects Analysis. Análise proativa. RPN = Severidade × Ocorrência × Detecção (cada 1-10). Tipos: DFMEA (projeto), PFMEA (processo), SFMEA (sistema). Severidade alta não tem correção, deve redirecionar projeto. Identifica modos de falha e efeitos.' },
  { subject: 'RCM', total: 10, easy: 5, hint: 'Reliability Centered Maintenance. Metodologia para definir estratégia ótima de manutenção. 7 perguntas: funções, modos de falha, efeitos, importância, consequências, tarefas possíveis. Decisão entre: RTF (run to failure), preventiva, preditiva, redesenho, PdM.' },
  { subject: 'RCA', total: 8, easy: 4, hint: 'Root Cause Analysis. Identifica causa raiz (não sintoma). Ferramentas: 5 Porquês, Ishikawa, diagrama de árvore. Foco em causa física, humana, sistêmica (latente). Aplicações: acidentes, falhas crônicas, desvios.' },
  { subject: 'ISO 55000', total: 8, easy: 4, hint: 'Norma de Gestão de Ativos (Asset Management). Conceitos: ativo (tangível/intangível), ciclo de vida do ativo, plano estratégico de gestão de ativos (SAMP), valor, alinhamento estratégico. Família: ISO 55000 (visão geral/conceitos), 55001 (requisitos), 55002 (orientações).' },
  { subject: 'ISO 55001', total: 8, easy: 4, hint: 'Requisitos para sistema de gestão de ativos. Estrutura HLS com cláusulas 4-10: 4 Contexto da organização, 5 Liderança, 6 Planejamento, 7 Suporte, 8 Operação, 9 Avaliação de desempenho, 10 Melhoria. PDCA integrado. Foco em plano de gestão de ativos.' },
  { subject: 'Curva ABC', total: 8, easy: 4, hint: 'Aplicação de Pareto em estoques. Classe A: ~20% itens representam ~80% valor (controle rígido). B: ~30% itens, ~15% valor (controle moderado). C: ~50% itens, ~5% valor (controle simples). Peças de reposição.' },
  { subject: 'Gestão de Custos na Manutenção', total: 8, easy: 4, hint: 'Custo total de propriedade (TCO = aquisição + operação + manutenção + descarte). Custo de falha (perda produção + multas + imagem). Custo de manutenção vs não manutenção. Orçamento. Indicadores: custo/manutenção por ativo, % custo manutenção/faturamento.' },
  { subject: 'SMED - Setup Rápido', total: 8, easy: 4, hint: 'Single Minute Exchange of Die (Shigeo Shingo). Troca rápida de ferramentas em <10 min. Separa operações internas (máquina parada) e externas (máquina rodando). Converte internas em externas. Aplica paralelismo, padronização, quick-fasteners.' },
  { subject: 'Takt Time', total: 8, easy: 4, hint: 'Takt (alemão = compasso musical). Takt Time = Tempo disponível / Demanda do cliente. Ritmo necessário para atender demanda. Diferença: Cycle Time (tempo real de produção), Lead Time (tempo do pedido à entrega). Usado em produção puxada.' },
  { subject: 'Lean Manufacturing', total: 12, easy: 6, hint: 'Sistema Toyota de Produção. 7 desperdícios (muda): superprodução, espera, transporte, superprocessamento, estoque, movimentação, defeitos. +1: talento humano subutilizado. Ferramentas: 5S, VSM (Value Stream Mapping), JIT (Just-in-Time), Jidoka, Kanban, Poka-yoke.' },
  { subject: 'DMAIC', total: 8, easy: 4, hint: 'Metodologia Seis Sigma: Define (definir problema), Measure (medir dados), Analyze (analisar causas), Improve (implementar soluções), Control (controlar e padronizar). Reduz variabilidade e defeitos. Meta: 3.4 defeitos por milhão (6 sigma).' },
  { subject: 'Projetos Industriais', total: 8, easy: 4, hint: 'Gestão de projetos de manutenção: paradas programadas (shutdown), comissionamento, gestão de mudanças (MOC), projetos de obra nova. Triângulo de ferro: escopo, prazo, custo (qualidade no centro). Fases: iniciação, planejamento, execução, monitoramento, encerramento. PMBOK.' },
]

function buildPrompt(topic: typeof TOPIC_PLAN[number]): { system: string; user: string } {
  const system = `Você é um especialista em Planejamento e Controle da Manutenção (PCM) e em elaboração de questões de múltipla escolha para concursos e treinamentos técnicos. Você gera questões TECNICAMENTE CORRETAS em PORTUGUÊS BRASILEIRO, baseadas em normas ABNT (NBR 5462), ISO 55000/55001, e melhores práticas da engenharia de manutenção (TPM, RCM, FMEA, Lean, Seis Sigma).

REGRAS OBRIGATÓRIAS:
1. Cada questão tem exatamente 4 alternativas (A, B, C, D). Apenas UMA é a correta.
2. Dificuldade EASY = definição direta, conceito básico, identificação. MEDIUM = aplicação prática, cálculo simples, interpretação de cenário, exceção.
3. NÃO repita enunciados. Varie a abordagem (definição, aplicação, cálculo, exemplo, qual NÃO é, exceção).
4. Distribua o gabarito de forma ALEATÓRIA e equilibrada (cerca de 25% para cada letra A/B/C/D), sem padrão tipo ABCDABCD.
5. A explicação deve justificar por que a correta está certa E brevemente por que as outras estão erradas.
6. Use termos técnicos corretos (MTBF, MTTR, OEE, FMEA, RPN, etc.) com precisão.
7. Em questões de cálculo, use números consistentes e fórmulas corretas:
   - MTBF = Tempo Total de Operação ÷ Número de Falhas
   - MTTR = Tempo Total de Reparo ÷ Número de Falhas
   - Disponibilidade = MTBF ÷ (MTBF + MTTR)
   - OEE = Disponibilidade × Performance × Qualidade
   - RPN = Severidade × Ocorrência × Detecção (cada fator 1-10)
8. Retorne APENAS um JSON array válido. Sem markdown, sem texto antes/depois. Formato:
[{"statement":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"...","difficulty":"EASY","subjectName":"NOME_EXATO"}]`

  const user = `Gere ${topic.total} questões de múltipla escolha sobre "${topic.subject}":
- ${topic.easy} questões com difficulty="EASY"
- ${topic.total - topic.easy} questões com difficulty="MEDIUM"
- Todas com subjectName="${topic.subject}" (nome exato, com acentos/parênteses)

Conteúdo de referência para embasar as questões: ${topic.hint}

Lembre: distribua aleatoriamente as 4 alternativas corretas (A/B/C/D) entre as ${topic.total} questões, evitando padrões. Retorne SOMENTE o JSON array com ${topic.total} objetos.`

  return { system, user }
}

function tryParseJSON(text: string): Q[] | null {
  let t = text.trim()
  // Strip markdown fences
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  const start = t.indexOf('[')
  const end = t.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return null
  const slice = t.substring(start, end + 1)
  try {
    return JSON.parse(slice)
  } catch {
    try {
      const fixed = slice
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
        // Fix unterminated strings at end (truncation)
      return JSON.parse(fixed)
    } catch {
      return null
    }
  }
}

function sanitizeQ(q: any, subject: string): Q | null {
  try {
    if (!q || typeof q !== 'object') return null
    const fields = ['statement', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation']
    for (const f of fields) {
      if (typeof q[f] !== 'string' || q[f].trim().length < 3) return null
    }
    const ans = String(q.correctAnswer || '').toUpperCase().trim()
    if (!['A', 'B', 'C', 'D'].includes(ans)) return null
    const diff = String(q.difficulty || '').toUpperCase().trim()
    if (!['EASY', 'MEDIUM'].includes(diff)) return null
    return {
      statement: q.statement.trim(),
      optionA: q.optionA.trim(),
      optionB: q.optionB.trim(),
      optionC: q.optionC.trim(),
      optionD: q.optionD.trim(),
      correctAnswer: ans as 'A' | 'B' | 'C' | 'D',
      explanation: q.explanation.trim(),
      difficulty: diff as 'EASY' | 'MEDIUM',
      subjectName: subject,
    }
  } catch {
    return null
  }
}

async function generateTopic(zai: any, topic: typeof TOPIC_PLAN[number]): Promise<Q[]> {
  const { system, user } = buildPrompt(topic)
  console.log(`\n[${topic.subject}] esperando ${topic.total} questões (${topic.easy}E/${topic.total - topic.easy}M)`)
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: system },
          { role: 'user', content: user },
        ],
        thinking: { type: 'disabled' },
      })
      const reply = completion.choices?.[0]?.message?.content
      if (!reply) {
        console.log(`  tentativa ${attempt}: resposta vazia`)
        continue
      }
      const parsed = tryParseJSON(reply)
      if (!parsed) {
        console.log(`  tentativa ${attempt}: JSON inválido (${reply.length} chars)`)
        continue
      }
      // Sanitize
      const cleaned: Q[] = []
      for (const q of parsed) {
        const s = sanitizeQ(q, topic.subject)
        if (s) cleaned.push(s)
      }
      if (cleaned.length === 0) {
        console.log(`  tentativa ${attempt}: 0 questões válidas após sanitização`)
        continue
      }
      console.log(`  ✓ ${cleaned.length} questões válidas (tentativa ${attempt})`)
      // If we got more than requested, trim
      if (cleaned.length > topic.total) {
        return cleaned.slice(0, topic.total)
      }
      // If short, retry once more then accept
      if (cleaned.length < topic.total && attempt < 4) {
        console.log(`  -> recebido ${cleaned.length}/${topic.total}, retentando...`)
        // Keep what we have and try to add more
        continue
      }
      return cleaned
    } catch (err: any) {
      console.log(`  tentativa ${attempt} erro: ${err?.message || err}`)
      await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  return []
}

async function main() {
  const outPath = path.join(__dirname, 'questions-data.json')
  const all: Q[] = []
  // Resume support
  if (fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'))
      if (Array.isArray(existing) && existing.length > 0) {
        all.push(...existing)
        console.log(`Retomando com ${all.length} questões já geradas.`)
      }
    } catch {
      /* ignore */
    }
  }

  const zai = await ZAI.create()
  for (let i = 0; i < TOPIC_PLAN.length; i++) {
    const topic = TOPIC_PLAN[i]
    // Skip if already have enough for this subject
    const have = all.filter((q) => q.subjectName === topic.subject).length
    if (have >= topic.total) {
      console.log(`\n[${topic.subject}] já tem ${have}/${topic.total}, pulando`)
      continue
    }
    const qs = await generateTopic(zai, topic)
    // Replace existing for that subject
    for (let k = all.length - 1; k >= 0; k--) {
      if (all[k].subjectName === topic.subject) all.splice(k, 1)
    }
    all.push(...qs)
    fs.writeFileSync(outPath, JSON.stringify(all, null, 2))
    console.log(`  Total acumulado: ${all.length} questões`)
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`\n=== Geração concluída: ${all.length} questões ===`)
  const bySubject: Record<string, number> = {}
  const byDiff: Record<string, number> = {}
  const byAns: Record<string, number> = {}
  for (const q of all) {
    bySubject[q.subjectName] = (bySubject[q.subjectName] || 0) + 1
    byDiff[q.difficulty] = (byDiff[q.difficulty] || 0) + 1
    byAns[q.correctAnswer] = (byAns[q.correctAnswer] || 0) + 1
  }
  console.log('Por disciplina:', JSON.stringify(bySubject, null, 2))
  console.log('Por dificuldade:', byDiff)
  console.log('Por gabarito:', byAns)
}

main().catch((e) => {
  console.error('Erro fatal:', e)
  process.exit(1)
})
