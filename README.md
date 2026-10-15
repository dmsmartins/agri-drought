# Agri-SECA 0.2 · Aplicação para GitHub Pages

Aplicação de balanço hídrico diário com Kcb mensal, índice de transpiração relativa e comparação de episódios. Inspirada no percurso da aplicação MedPDSI: dados → cálculo → séries e mapa → comparação.

**O ficheiro `index.html` é autónomo. Não precisa de R, Shiny, Python, npm ou servidor de cálculo para funcionar.** O Python é usado apenas para reconstruir o HTML a partir do código fonte; Node é usado nos testes.

## Experimentar

Abrir `index.html` num navegador moderno (Chrome, Edge, Firefox ou Safari) e selecionar **Explorar demonstração**. Todo o código, os estilos e os dados sintéticos estão incorporados. O cálculo usa um Web Worker, mantendo a interface disponível. Alguns visualizadores de anexos não permitem executar scripts/workers; nesse caso, descarregar o HTML e abri-lo no navegador.

A demonstração tem três locais ilustrativos, 1980–2025, com parâmetros assumidos. Não representa três estações observadas. O local A usa o forçamento sintético da versão Python; B usa P×1,15 / ET0×0,92 e C usa P×0,80 / ET0×1,08. A referência é 1985–2014.

## Novo nesta versão

Em **Índices e episódios**, calcular Z da transpiração relativa e Z da ETa, com janelas de 1/3/6/12 meses e referência sazonal fixa. A transpiração relativa é o indicador principal. O indicador anterior de água disponível continua acessível.

Comparar os episódios: duração, pico, magnitude média, severidade acumulada e antecipação da confirmação, acompanhadas de deteção e falsos alarmes. A referência pode ser outro índice ou uma cronologia mensal independente importada.

SPI/SPEI empíricos são calculados no navegador. Para SPI/SPEI paramétricos e sc-PDSI, usar o script R incluído e importar o CSV. O script R não foi executado neste ambiente. **sc-PDSI não é calculado no navegador nesta versão.**

Consultar **INDICES-E-VALIDACAO.md** para fórmulas, formatos, limitações, protocolo de avaliação e execução do script. Os comparadores externos são harmonizados para a comparação; os valores nativos são preservados na exportação.

## Funcionalidades

- Meteorologia diária, um ou vários locais, em CSV; validação de datas, lacunas, unidades numéricas e limites.
- CSV opcional de coordenadas WGS84 para georreferenciar os resultados.
- Edição/importação dos 12 Kcb; parâmetros de solo, cultura, runoff, análise, referência e inicialização.
- Cálculo físico diário, agregação mensal e percentis por mês do calendário.
- Séries interativas de água disponível, percentil, défice de transpiração e P/ETa, com seleção de local e intervalo.
- Mapa de pontos em coordenadas latitude/longitude, sem interpolação e sem mapa-base externo.
- Cenários A/B guardados na sessão, comparação gráfica e exportação. Diferentes meteorologias são assinaladas; comparar percentis inclui a alteração da climatologia de cada cenário.
- Exportação do balanço diário, resultados mensais, comparação, parâmetros, metadados e referência.
- Importação de uma referência congelada; erro se o local, os Kcb ou os parâmetros físicos não coincidirem.

Não há gravação automática da sessão. Fechar ou recarregar a página apaga dados/resultados em memória. Exportar os ficheiros necessários antes de sair.

## Publicar no GitHub Pages

O projeto está preparado para o repositório [dmsmartins/agri-drought](https://github.com/dmsmartins/agri-drought).

1. Em **Settings → Pages → Build and deployment**, selecionar **GitHub Actions**.
2. Em **Actions → Publish GitHub Pages → Run workflow**, executar na branch `main`.
3. O workflow valida o cálculo e as interações em Chromium, reconstrói o HTML e publica apenas a aplicação e os documentos de apoio.
4. Abrir o endereço devolvido pelo passo de publicação. O endereço esperado é `https://dmsmartins.github.io/agri-drought/`, mas só fica disponível após publicação bem-sucedida.

O workflow de publicação é manual. Cada push em `main` e cada pull request executam o workflow **Validate Agri-SECA**. A ativação de Pages depende das definições e do plano da conta; o repositório mantém a visibilidade escolhida pelo proprietário. Guardar o código no GitHub não significa que o site já esteja publicado.

Não há chaves nem serviços de cálculo necessários. Os dados importados pelos visitantes são processados no navegador e não são enviados ao GitHub. O pacote publicado exclui as referências numéricas de teste e dados importados localmente.

Fonte: [GitHub — custom workflows for Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Entradas

Meteorologia, formato longo, um registo por local e dia:

```csv
station_id,date,P_mm,ET0_mm,u2_m_s,RHmin_pct
LOCAL_A,1980-01-01,5.2,1.1,2.0,60
LOCAL_A,1980-01-02,0.0,1.2,1.8,58
```

`station_id` pode ser omitido para um único local. Cada local tem de ter dias ordenados, consecutivos e sem duplicados. O cálculo requer vários anos completos, incluindo inicialização anterior à análise; o excerto acima mostra apenas o formato. Separador vírgula ou ponto e vírgula. Com separador ponto e vírgula, podem usar-se vírgulas decimais.

- P e ET0: **mm/dia**, não totais mensais.
- Vento a 2 m: m/s. RH mínima: percentagem 0–100.
- ET0 deve vir de um método documentado; esta app não calcula ET0 a partir da temperatura.
- Limite desta versão: 250 000 registos diários por execução; importações até 35 MB.
- Os parâmetros são comuns a todos os locais da execução. Para solos/culturas distintos, separar execuções. Não há parametrização por estação nesta versão.

Coordenadas opcionais:

```csv
station_id,name,latitude,longitude
LOCAL_A,Nome do local,38.5,-8.9
```

Kcb:

```csv
month,kcb
1,0.55
2,0.55
```

Fornecer os **12 meses**. Os coeficientes do exemplo são ilustrativos, não um calendário mensal validado para o teu olival.

## Modelo, teste e limites

Port direto do núcleo conservativo Python da versão Agri-SECA Kcb mensal 0.1.0, com zona radicular fixa e solo homogéneo. Mantém as hipóteses explicitadas em `METODOLOGIA.md`; não é a implementação oficial SIMDualKc, uma solução de Richards nem um modelo validado em campo.

A comparação JavaScript/Python usa **16 802 dias e 492 meses**: diferenças físicas máximas inferiores a 3×10⁻¹³ nas variáveis comparadas, percentis coincidentes. Foram aprovados **37 testes JavaScript** (16 do motor, 2 do worker e 19 dos índices e episódios), além da comparação integral. A estrutura HTML, os controlos e a ausência de scripts externos foram verificados.

**Revisão visual manual pendente.** O teste `tests/browser-smoke.cjs` foi acrescentado para execução em Chromium pelo GitHub Actions (demonstração, worker, cenários, mapa, quatro janelas, comparação, download e importação de observações). A instalação local do navegador falhou; consultar o resultado do workflow antes de considerar os testes de interação aprovados. Os testes de worker correm no Node com a ponte de mensagens equivalente; não substituem a avaliação de compatibilidade dos browsers, responsividade, downloads e seleção de ficheiros. Abrir a demonstração e verificar esses fluxos antes de disponibilização operacional.

## Desenvolver e reproduzir

Sem instalação de dependências (Node 22+ e Python 3):

```bash
node --test tests/engine.test.cjs tests/worker.test.cjs tests/indices.test.cjs
node tests/integration-indices.cjs
node tests/parity.cjs
python build.py
python tests/static_check.py
```

- `src/engine.cjs`: cálculo físico e índice, utilizável no navegador/worker e Node.
- `src/indices.cjs`: padronização empírica, episódios e métricas de avaliação.
- `src/lab.js`, `src/lab.html`: área de índices e comparação.
- `scripts/benchmarks.R`: ponte para os pacotes R SPEI/scPDSI, execução local.
- `src/app.js`: importação, controlo da sessão, gráficos, mapas, comparação e exportação.
- `src/template.html`, `src/styles.css`: interface.
- `src/demo-data.json`: dados exclusivamente sintéticos e configuração.
- `tests/python-reference.json`: resultados de referência produzidos pela versão Python.
- `tests/parity-results.json`: comparação do motor.
- `index.html`: artefacto final autónomo, preparado para Pages.

Ao alterar equações ou convenções de referência, atualizar a versão do motor e revalidar a equivalência. A compatibilidade da referência web usa versão, local, Kcb e parâmetros físicos; os JSON de referência Python e web têm formatos diferentes e não são intercambiáveis nesta versão.

Licença **GPL-3.0-or-later**. Ver `NOTICE.md`.

## Estado e próximos passos

- Núcleo físico e índices: 37 testes locais aprovados; paridade com a referência Python verificada.
- Comparadores R: script incluído, ainda não executado/validado nesta entrega.
- Validação independente com dados observados: pendente; dados de demonstração sintéticos.
- Publicação: workflow preparado, requer ativação de Pages nas definições do repositório.

Teste opcional do navegador (requer instalar Playwright e Chromium):

```bash
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node tests/browser-smoke.cjs
```
