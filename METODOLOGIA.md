# Especificação do modelo e do indicador

**Estatuto:** modelo conceptual conservativo inspirado na FAO-56, com decisões computacionais explícitas. Não se afirma que todas as suas hipóteses sejam leis físicas exatas ou que estejam validadas para um olival real.

## 1. Estrutura física e conservação

Usam-se dois intervalos de profundidade: 0–Ze e Ze–Zr. O primeiro tem duas áreas complementares, exposta (1−fc) e coberta (fc). O segundo ocupa a área total. São volumes físicos disjuntos; todos têm parâmetros hidráulicos iguais. A água total é S = Σ(area_j × water_j), nunca TEW+TAW.

Com as fronteiras escolhidas (sequeiro, sem interceção/ascensão capilar):

`P = RO + DP + Es + Ta + ΔS + residual`

Todas as parcelas são expressas em mm por unidade de área do terreno. Cada fluxo é debitado/creditado no estado. Não se corrige uma reserva negativa ou excessiva por truncagem sem fluxo correspondente. O cálculo interrompe-se se o erro diário ultrapassar 10⁻⁸ mm ou algum volume sair dos limites permitidos.

No esquema adotado, raízes retiram apenas água acima de θWP; a evaporação superficial pode atingir 0,5 θWP. Por isso, uma superfície abaixo de WP não obriga a reserva radicular disponível a ser negativa. Os estados absolutos e a água extraível são diferentes variáveis.

## 2. Equações dos coeficientes

Base bibliográfica: FAO-56, capítulos 7 e 8 [1–2].

`Tp = Kcb[mês] × ET0; Ta = Ks × Tp; Es = Ke × ET0; ETa = Ta + Es`

`TAW = 1000 (θFC−θWP) Zr; RAW = p TAW`

`Ks = 1` enquanto `Dr ≤ RAW`; depois `Ks = ASW / ((1−p) TAW)`.

`TEW = 1000 (θFC−0,5 θWP) Ze`

`Kr = 1` até `De ≤ REW`; depois `Kr = (TEW−De)/(TEW−REW)`, limitado a 0–1.

`Ke = min[Kr (Kcmax−Kcb), few Kcmax]`, com `few = 1−fc` para chuva que molha toda a superfície.

`Kcmax = max[1,2 + (0,04(u2−2) − 0,004(RHmin−45))(h/3)^0,3, Kcb+0,05]`.

Vento e RH entram no domínio empírico da expressão (1–6 m/s; 20–80%), com dias limitados assinalados. Kcb é fornecido já apropriado ao olival; não há correção climática automática dessa tabela.

Quando `adjust_p=true`, aplica-se `p = p_base + 0,04(5−ETc)`, limitado a 0,1–0,8. No código, ETc usa `(Kcb+Ke_requested)ET0` antes da limitação por disponibilidade. Isto é uma convenção explícita da aplicação dual.

## 3. Fecho espacial adotado — hipótese, não calibração de raízes

ASW soma, em cada volume, a água acima de WP e até FC, ponderada pela área. Dr = TAW−ASW. Esta definição evita que água superficial não extraível compense matematicamente água extraível mais profunda.

Ta solicitada é distribuída proporcionalmente à água extraível existente em cada volume, após a evaporação do subpasso. Não se introduzem densidades radiculares desconhecidas. A extração total é limitada à água existente e todos os volumes estão integralmente dentro da zona enraizada.

Esta hipótese equivale a acesso agregado à reserva, não a um modelo de condutância das raízes. A alteração de Zr altera também TAW e a relação de stress. Consequentemente, a limitação identificada em setembro — adicionar solo seco pode reduzir Ks — continua inerente à aproximação agregada. A presente versão evita usá-la como modelo de adaptação das raízes; Zr fica fixo por aplicação.

Ze e Zr definem compartimentos conceptuais, não uma malha livre de uma equação diferencial. O fluxo público recusa camadas arbitrárias e raízes dinâmicas. Não se declara convergência espacial por terem sido removidas essas opções.

## 4. Ordem dos fluxos

1. Calcular runoff do total diário de precipitação.
2. Aplicar P−RO às duas áreas superficiais. O excesso à saturação é encaminhado para baixo, com saída explícita na base.
3. Calcular evaporação e transpiração em subpassos iguais (4 no exemplo). Kr e Ks atualizam-se com o estado; cada subpasso recebe ET0/4. A evaporação é debitada primeiro, a transpiração depois; Ks é avaliado antes desses débitos.
4. No fim do dia, encaminhar excesso acima de FC para o compartimento seguinte e para a base.
5. Verificar conservação e limites; guardar o estado de fim do dia.

O estado temporário pode superar FC até à saturação. A drenagem é uma aproximação por reservatórios, sem velocidade obtida de uma curva hidráulica. Não se representa fluxo ascendente nem infiltração dependente da intensidade da chuva. `rain_timing` explicita chuva antes/depois da ET ou repartida pelos subpassos. O padrão é antes. `Ke` e `Ks` de saída são coeficientes efetivos integrados; `Ks_requested`, `Kr` e `p` documentam estados intermédios/finais.

## 5. Escoamento

No exemplo, utiliza-se CN fixo. Com `S_CN = 25400/CN−254`, `Ia = λ S_CN`: RO=0 para P≤Ia; nos restantes casos, `RO=(P−Ia)²/(P−Ia+S_CN)` [3]. A água Ia não é novamente subtraída: a entrada do solo é P−RO.

CN=70 e λ=0,2 são hipóteses ilustrativas, não parâmetros calibrados. O método é originalmente de eventos; tratar cada dia como evento independente limita a representação de episódios de vários dias. Não se afirma que CN fixo seja mais rigoroso que a formulação anterior dependente da humidade; é uma simplificação exposta. `none_control` serve para ensaios explícitos, não para omitir escoamento silenciosamente.

## 6. Inicialização, agregação e referência

O spin-up repete os primeiros anos completos, que têm de anteceder a análise. Duas trajetórias, inicialmente seca/húmida, devem convergir entre si e entre fronteiras de ciclos em todos os volumes. A tolerância do exemplo é 0,05 mm por volume, mínimo dois ciclos. Em seguida, corre-se cronologicamente todo o forçamento desde a primeira data. Anos preparatórios são excluídos da referência.

O indicador usa a média mensal de ASW nos fins de dia. Os fluxos são somados; stress é guardado em dias e em fração de transpiração não satisfeita. Mês incompleto não recebe percentil.

Para cada mês do calendário, a referência guarda os valores anuais x₁…xₙ, arredondados a 10⁻⁶ mm para tratar empates numéricos. Para um valor x, sejam L o número de valores menores e E o número de valores iguais:

`percentil = 100 × (L + E/2 + 0,5)/(n+1)`.

Esta é uma posição empírica limitada, com midrank para empates; é uma convenção do projeto. Evita probabilidades exatamente 0/1 e não ajusta uma distribuição paramétrica. Não é um período de retorno nem uma probabilidade calibrada dos extremos. Valores fora da referência ficam sinalizados; uma referência constante fornece 50 no mesmo valor e é explicitamente marcada como não discriminante.

O padrão exige 30 valores completos por mês. O utilizador pode reduzir explicitamente `min_years` (mínimo 2), mas a referência é marcada como curta. Uma série longa não garante estacionariedade nem independência entre anos. Deve fixar-se um período coerente com a finalidade da monitorização.

O ajuste não lê anos fora dos limites declarados. A aplicação reutiliza o ficheiro congelado e verifica a assinatura do modelo; mudança de parâmetros exige reajuste explícito. A disponibilidade climática de um ano futuro nunca atualiza automaticamente a referência. Resultados anteriores à referência são retrospetivos; os que pertencem à referência estão na amostra.

## 7. Dicionário de compatibilidade

O núcleo preserva alguns nomes de setembro para rastreabilidade:

- `ETc_potential` = Tp + Es efetiva: potencial condicional à evaporação realizada; não usar como procura climática independente.
- `ET_deficit` = Tp−Ta, apenas défice de transpiração.
- `recharge` / `recharge_net` = max(ΔS,0), ganho líquido de armazenamento; não recarga subterrânea.
- `deep_percolation` / `bottom_percolation` = saída na base modelada; não observação de recarga do aquífero.
- `water_volume_0_local_mm` e `1` são profundidades locais de água nas áreas exposta/coberta; multiplicar pelas áreas antes de somar. O volume `2` ocupa a área total.

## 8. Validação pendente e critério de utilidade

A verificação numérica não substitui observações. A próxima aplicação requer parâmetros locais documentados, meteorologia diária/ET0 e, idealmente, humidade por profundidade e ET/transpiração, com unidades e suporte comparáveis. Fixar critérios de erro, separar períodos de parametrização e avaliação e analisar secagem/recuperação. Dados sintéticos servem para verificar comportamento, não para demonstrar superioridade agrícola.

Só depois avaliar se o armazenamento e a limitação hídrica identificam informação útil adicional a SPI/SPEI/scPDSI. Não interpretar correlação entre índices como validação física nem um percentil como perda de produção.

## Referências

1. Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998). FAO Irrigation and Drainage Paper 56, capítulo 7, equações 69–74 e exemplo 31. https://www.fao.org/4/x0490e/x0490e0c.htm
2. Mesma obra, capítulo 8, equações 80–85 e exemplo 37. https://www.fao.org/4/x0490e/x0490e0e.htm
3. USACE HEC-HMS Technical Reference Manual. SCS Curve Number Loss Model. https://www.hec.usace.army.mil/confluence/hmsdocs/hmstrm/canopy-surface-infiltration-and-runoff-volume/infiltration/scs-curve-number-loss-model

Equações bibliográficas, hipóteses do exemplo e decisões novas do código são distinguidas acima. Não se apresenta esta implementação como SIMDualKc oficial.
