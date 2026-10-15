# Agri-SECA 0.2 — transpiração relativa e comparação de episódios

Decisão de 15 de outubro de 2026: usar a transpiração relativa como variante principal, manter a anomalia de ETa e o indicador anterior de água disponível, comparar com SPI, SPEI e sc-PDSI. O balanço hídrico 0.1.0-web foi preservado.

## Variáveis e padronização

Para uma janela de k meses (1, 3, 6 ou 12), somar primeiro os fluxos diários:

- **R = ΣTa / Σ(Kcb mensal × ET0)**. É uma razão de somas, não a média das razões diárias/mensais. A água transpirada resulta do balanço conservativo com limitação pela água acessível. R=0,6 significa 60% da transpiração sem stress modelada; não significa uma perda de produção de 40%.
- **ETa acumulada = Σ(Ta + Es)**, mantida como alternativa. Uma anomalia de ETa pode refletir procura atmosférica, além da disponibilidade de água.
- **SPI_EMP**: padronização empírica de ΣP.
- **SPEI_EMP**: padronização empírica de Σ(P − ET0).

SPI_EMP e SPEI_EMP são variantes não paramétricas exploratórias. Não são apresentadas como resultados numericamente equivalentes a SPI Gamma ou SPEI log-logístico.

A referência é fixa e separada por mês do fim da janela. Para cada variável, p=(L + E/2 + 0,5)/(n+1), em que L conta valores inferiores e E conta empates; Z=Φ⁻¹(p). Menor Z corresponde a uma condição relativamente mais seca. Quantização: 10⁻⁸ para R e 10⁻⁶ mm para fluxos. Os valores históricos usados na referência são exportáveis.

O cálculo usa os meses completos anteriores ao início da análise para preencher as janelas iniciais. Uma janela com lacunas ou mês parcial é indefinida. R fica indefinido se a procura acumulada não ultrapassar o mínimo escolhido (1 mm por janela por defeito, critério numérico explícito a rever para a cultura). A referência exige o número de anos indicado, por defeito 30; não há substituição automática por uma referência mais curta. Meses de referência constantes produzem Z indefinido, inclusive quando um novo valor está fora desse valor constante: a frequência de raridade não é identificável.

Os empates, especialmente em R=1, impedem uma distribuição exatamente normal e frequências de alarme exatamente iguais. Não há extrapolação das caudas: com n=30, os valores fora do histórico ficam limitados aproximadamente a |Z|=2,14. Nunca interpretar estes valores como retorno de 100 anos. A reserva física e o défice continuam disponíveis quando a padronização é indefinida.

## Comparadores convencionais

A importação usa CSV longo:

```
station_id,month,index,scale,value,source,ref_start,ref_end
LOCAL_A,2015-01,scPDSI,0,-2.1,R scPDSI versão a indicar,1985,2014
```

O valor ilustrado serve apenas para mostrar o formato, não é um resultado real. `scale` vale 1/3/6/12 para índices de janela, ou 0 para memória própria, como sc-PDSI. Valores vazios são desconhecidos, não zero. O importador rejeita duplicados, meses inválidos e metadados inconsistentes. O utilizador deve assegurar que menores valores representam maior seca, que as estações coincidem e que as fontes/calibrações estão documentadas.

A aplicação preserva os valores originais como `raw_value`. Para comparar severidade e limiares entre escalas diferentes, transforma também os comparadores externos para uma escala normal empírica sazonal comum. Esta transformação NÃO é a série nativa SPI/SPEI/sc-PDSI. É uma harmonização para avaliação. Não elimina diferenças de calibração, meteorologia, resolução espacial ou memória. Resultados externos de uma janela diferente não aparecem; sc-PDSI, com memória própria, continua selecionável e identificado.

O script `scripts/benchmarks.R` usa os pacotes dos respetivos autores:

- `SPEI::spi`: Gamma, momentos ponderados por probabilidades não enviesados (ub-pwm).
- `SPEI::spei`: log-logístico, ub-pwm.
- `scPDSI::pdsi`: `sc=TRUE`, referência explícita e AWC fornecida.

Em Índices e episódios → Comparadores → Cálculo convencional, exportar a meteorologia mensal. O ficheiro inclui P e ET0 somados dos mesmos dados diários; ET0 é usada como PET fornecida aos comparadores. AWC é a TAW do perfil modelado. Usar a mesma capacidade total não torna os modelos de solo equivalentes. O script exige anos civis completos, sem lacunas, e pelo menos um ano anterior à referência.

```
Rscript scripts/benchmarks.R clima_mensal_benchmarks.csv indices_externos.csv 1985 2014
```

É necessário ter R e os pacotes SPEI/scPDSI instalados. O script não instala pacotes, não transfere dados nem altera a aplicação. Regista as versões dos pacotes no CSV e guarda `sessionInfo()` num ficheiro adjacente. Importar o CSV resultante na aplicação. Não existe cálculo de sc-PDSI dentro do navegador nesta versão. O script R foi escrito contra as interfaces documentadas, mas não foi executado neste ambiente, que não tem R.

## Episódios e métricas

Regra inicial: Z ≤ −1, pelo menos 1 mês consecutivo, sem juntar episódios separados por meses normais. Limiar e persistência são configuráveis. A mesma regra é aplicada aos índices comparados. A série de observações usa os seus próprios meses binários de seca; não é filtrada pela persistência do índice.

- **Duração D:** número de meses consecutivos no episódio.
- **Pico:** menor Z; reporta-se também o respetivo mês.
- **Severidade S:** Σ(−Z) nos meses do episódio, em Z·mês.
- **Magnitude média:** S/D. Esta convenção é explícita; outros trabalhos usam a palavra magnitude para S.
- **Excesso abaixo do limiar:** Σ(limiar − Z), exportado separadamente.
- **Início:** primeiro mês do episódio.
- **Confirmação:** mês em que a persistência exigida é satisfeita. Com persistência 2, só o segundo mês permite confirmar.

Comparam-se apenas meses com dados válidos em ambas as séries, dentro do período escolhido. Lacunas interrompem episódios; os limites contíguos a lacunas ou ao início/fim da avaliação ficam censurados. Episódios censurados não entram em diferenças de duração, pico ou severidade. A antecipação pode ser calculada quando ambos os inícios são conhecidos, mesmo que um fim esteja censurado.

Associação: candidatos com sobreposição temporal ou distância entre inícios até 3 meses (configurável); exige cobertura comum contínua em todo o intervalo entre os episódios. Ordena-se por maior sobreposição, depois menor distância dos inícios; associação um-a-um, determinística e gulosa, não uma otimização global. Exportam-se episódios sem par. A sensibilidade à tolerância e ao desdobramento/fusão de episódios deve ser avaliada antes de tirar conclusões.

### Antecipação

**Lead = confirmação da referência − confirmação do índice**, em meses. Positivo: índice confirmou antes; negativo: confirmou depois. A aplicação apresenta mediana, média, número de pares e fração de pares com lead positivo. Também exporta a diferença entre inícios retrospectivos. Não há arredondamento para semanas ou dias: a avaliação tem resolução mensal.

Um lead positivo só é calculado entre episódios associados. Reportar sempre o número de eventos, a deteção e os falsos alarmes; os episódios falhados não podem desaparecer da avaliação.

### Deteção e falsos alarmes

Mensalmente, antes do filtro de persistência:

- POD = TP/(TP+FN), fração dos meses de seca da referência detetados.
- FAR = FP/(TP+FP), fração dos alarmes sem confirmação na referência.
- CSI = TP/(TP+FP+FN).
- FPR = FP/(FP+TN), taxa de falsos positivos nos meses sem seca.

POD e FAR são também calculados por episódio. Nestes casos contam apenas pares completos e episódios completos sem par; excluem-se pares censurados e os seus dois membros dos denominadores. Denominador zero resulta em indefinido, não em desempenho perfeito. Os denominadores são mostrados/exportados. Uma maior frequência de alarmes pode aumentar a aparente antecipação; a taxa efetiva de meses em alarme também é reportada.

## Concordância e validação independente

Escolher SPI, SPEI ou sc-PDSI como referência mede concordância entre índices. Não prova que um índice deteta a seca real nem que os outros estão errados. Seca meteorológica e stress agrícola podem ter inícios e recuperações diferentes.

Para uma avaliação independente, importar uma cronologia mensal com:

```
station_id,month,drought,source
LOCAL_A,2015-01,0,observacoes_a_documentar
LOCAL_A,2015-02,1,observacoes_a_documentar
LOCAL_A,2015-03,,observacoes_a_documentar
```

Na importação, a fonte tem de ser consistente por local; um único identificador pode remeter para uma descrição detalhada das observações. `1` significa seca documentada; `0`, ausência documentada; vazio ou mês ausente, desconhecido. Não usar apenas uma lista de secas e preencher os restantes meses com zero sem evidência. Podem usar-se humidade do solo observada, sinais independentes da vegetação ou impactos agrícolas, com critério de seca previamente definido. Produção anual, isoladamente, não fornece um mês de início fiável.

A independência é declarada pelo utilizador, não verificada automaticamente. Não validar a transpiração relativa apenas contra o stress do mesmo modelo: seria circular.

## Protocolo proposto para o estudo

1. Fixar cultura, solo, Kcb e referência climatológica com registo de proveniência.
2. Usar o mesmo forçamento para os índices sempre que possível; documentar PET, AWC, resolução e implementação.
3. Definir limiares, persistência e associação antes de olhar para o período de teste.
4. Avaliar fora da calibração, por defeito a partir do ano seguinte ao fim da referência.
5. Comparar janelas de 1, 3, 6 e 12 meses sem atribuir ao sc-PDSI uma janela que não possui.
6. Verificar episódios conhecidos e uma cronologia independente com cobertura de meses secos e não secos.
7. Avaliar robustez por local, cultura, limiar e janela; quantificar incerteza por episódios/blocos, não assumindo meses independentes.
8. Para alegar deteção operacional antecipada, executar um hindcast sequencial com referências fixas, dados e versões disponíveis em cada data e latências reais. Retirar da análise a informação que ainda não era conhecida. Séries revistas de sc-PDSI e classificações retrospectivas podem usar informação posterior.

Esta entrega implementa a exploração retrospectiva mensal. Não implementa bootstrap/intervalos de confiança, otimização global de associação, previsão nem um hindcast operacional de todos os comparadores.

## Verificação

37 testes JavaScript: 16 do núcleo físico, 2 do worker e 19 de índices/episódios. Testes adicionais de integração executam 16 802 dias sintéticos e todas as quatro janelas. Testes explícitos cobrem referência fixa sem fuga temporal para a padronização, razão de somas, empates, falta de procura, lacunas, episódios censurados, persistência, sinal da antecipação, deteção e falsos alarmes.

A equivalência numérica com Python do núcleo físico foi novamente confirmada. Não houve validação com dados reais. Não foi possível realizar a revisão visual/interação num navegador real neste ambiente. O script R ainda precisa de execução num ambiente com os pacotes instalados e de conferência dos resultados.

## Fontes

- FAO-56, capítulo 8, stress hídrico e balanço: https://www.fao.org/4/x0490e/x0490e0e.htm
- Documentação do pacote SPEI: https://cran.r-project.org/web/packages/SPEI/SPEI.pdf
- Código e documentação do scPDSI: https://github.com/Sibada/scPDSI
- Wells et al. (2004), A Self-Calibrating Palmer Drought Severity Index: https://digitalcommons.unl.edu/natrespapers/1161/
- Vicente-Serrano et al. (2018), SEDI: https://doi.org/10.1175/JCLI-D-17-0775.1

As regras específicas de associação e as convenções das métricas acima são escolhas desta aplicação e devem ser declaradas na metodologia científica.
