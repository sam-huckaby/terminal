import { createSignal, type Component, For, Switch, Match, onMount } from 'solid-js';
import { createClient } from '@openauthjs/openauth/client'
import Button from './button'

type Question = {
  id: string;
  question: string;
};

type FeudQuizProps = {
  questions: Question[];
  authUrl: string;
};

type LoadingLine = {
  text: string;
  highlight?: boolean;
};

const FeudQuiz: Component<FeudQuizProps> = (props) => {
  const client = createClient({
    clientID: 'www',
    issuer: props.authUrl,
  })

  let accessToken: string | undefined = undefined

  async function getToken() {
    const refresh = localStorage.getItem('refresh')
    if (!refresh) return

    const next = await client.refresh(refresh, {
      access: accessToken,
    })
    if (next.err) return
    if (!next.tokens) return accessToken

    localStorage.setItem('refresh', next.tokens.refresh)
    accessToken = next.tokens.access
    return next.tokens.access
  }

  async function login() {
    const token = await getToken()
    if (!token) {
      const { challenge, url } = await client.authorize(location.href, 'code', {
        pkce: true,
      })
      sessionStorage.setItem('challenge', JSON.stringify(challenge))
      window.location.href = url
    } else {
      setGameState('playing')
    }
  }

  function logout() {
    localStorage.removeItem('refresh')
    accessToken = undefined
    // window.location.replace('/')
  }

  async function callback(code: string, state: string) {
    const challengeStr = sessionStorage.getItem('challenge')
    if (!challengeStr) return

    const redirect = location.href.split("?")[0]
    const challenge = JSON.parse(challengeStr)
    if (code) {
      if (state === challenge.state && challenge.verifier) {
        const exchanged = await client.exchange(
          code,
          redirect,
          challenge.verifier,
        )
        if (!exchanged.err && exchanged.tokens) {
          accessToken = exchanged.tokens.access
          localStorage.setItem('refresh', exchanged.tokens.refresh)
        }
      }
      window.location.replace(redirect)
      await startGame()
    }
  }

  const [gameState, setGameState] = createSignal<'start' | 'playing' | 'finished'>('start');
  const [currentQuestionIndex, setCurrentQuestionIndex] = createSignal(0);
  const [loadingText, setLoadingText] = createSignal<LoadingLine[]>([]);

  const currentQuestion = () => props.questions[currentQuestionIndex()];
  const isLastQuestion = () => currentQuestionIndex() === props.questions.length - 1;

  onMount(async () => {
    const hash = new URLSearchParams(location.search.slice(1))
    const code = hash.get('code')
    const state = hash.get('state')
    if (code && state) await callback(code, state)

    if (await getToken()) {
      setGameState('playing')
    }
  });

  const startGame = async () => {
    const token = await getToken()
    console.log({ token })

    if (token) {
      setGameState('playing')
    } else {
      await login()
    }
    // setInitialized(true)
    // setSignedIn(!!token)
    // if (token) router.navigate('/splash')
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const answer = formData.get('answer') as string;

    // Send the answer as a POST request to the Astro page
    fetch('', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionId: currentQuestion().id,
        question: currentQuestion().question,
        answer,
      }),
    });

    // Clear the form
    (e.target as HTMLFormElement).reset();

    if (isLastQuestion()) {
      setGameState('finished');
      showLoadingAnimation();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex() + 1);
    }
  };

  const showLoadingAnimation = () => {
    const texts: LoadingLine[] = [
      { text: '$ ./run_data_analysis.sh  Starting data analysis job...' },
      { text: 'Initializing parameters...' },
      { text: 'Setting up AI modules and configurations...' },
      { text: 'Allocating memory and preparing runtime environment...' },
      { text: 'System check complete. No issues detected.' },
      { text: 'Loading data from source...', highlight: true },
      { text: 'Data connection established to database: feud_answers_2025-04-18.csv' },
      { text: 'Fetching records...' },
      { text: 'Data successfully loaded. Total records: 12,398', highlight: true },
      { text: 'Performing data integrity checks...' },
      { text: 'Data integrity verified. No discrepancies found.' },
      { text: 'INFO  | Sponsored message from Sentry: "Track errors in real-time. Increase your app\'s reliability. Visit ssh terminal.shop for details."' },
      { text: 'Running pre-processing tasks...' },
      { text: 'Tokenizing text entries...' },
      { text: 'Removing duplicates and invalid records...' },
      { text: 'Converting data to a structured format...' },
      { text: 'Normalizing and cleaning data fields...', highlight: true },
      { text: 'Pre-processing complete. Ready for main analysis.' },
      { text: 'INFO  | Sponsored message from Tarides: "Building the future of scalable OCaml applications. Learn more at ssh terminal.shop."' },
      { text: 'Executing main analysis...' },
      { text: 'Loading model: Advanced Feud Answer Analyzer', highlight: true },
      { text: 'Allocating resources to GPU...' },
      { text: 'Model successfully loaded. Starting analysis...' },
      { text: 'Analyzing answer patterns...' },
      { text: 'Identifying top-scoring answers...', highlight: true },
      { text: 'Calculating sentiment scores...' },
      { text: 'Detecting anomalies in response distribution...' },
      { text: 'Progress: [========          ] 45% (Ongoing)' },
      { text: 'INFO  | Memory optimization in progress to handle large data efficiently...' },
      { text: 'Progress: [===============   ] 85% (Almost Done)' },
      { text: 'INFO  | Sponsored message from OCaml: "Speed, Safety, Flexibility - All with OCaml. Discover the possibilities at ssh terminal.shop."' },
      { text: 'Progress: [====================] 100% (Completed)', highlight: true },
      { text: 'Analysis successful' },
      { text: 'Extracting key insights...' },
      { text: 'Generating summary report...' },
      { text: 'Finalizing output files...' },
      { text: 'Output generated successfully.' },
      { text: 'Output: - Results saved to: /home/feud/analysis/output/answers_summary.txt - Summary insights saved to: /home/feud/analysis/output/summary_insights.txt - Detailed metrics saved to: /home/feud/analysis/output/detailed_metrics.csv - Logs saved to: /home/feud/answers/logs/2025-04-18_feud.log' },
      { text: 'INFO  | Sponsored message from Ahrefs: "Boost your SEO strategy with Ahrefs. Find out more at ssh terminal.shop."' },
      { text: 'Cleaning up temporary files...' },
      { text: 'Releasing allocated memory...' },
      { text: 'Closing database connection...' },
      { text: 'System resources successfully released.' },
      { text: 'Job completed at 16:45:12 Total execution time: 2m 34s', highlight: true },
      { text: 'INFO  | Thank you for using terminal.shop! Visit ssh terminal.shop to learn more about our sponsors: Sentry, Tarides, OCaml, and Ahrefs.' },
      { text: '$ Process completed successfully.' },
    ];

    let i = 0;
    const processNextLine = () => {
      if (i < texts.length) {
        const line = texts[i];
        setLoadingText(prev => [...prev, line]);
        i++;

        // Delay next line based on highlight status
        const delay = line.highlight ? 2000 : 150;
        setTimeout(processNextLine, delay);
      }
    };

    processNextLine();
  };

  return (
    <div class="grow w-full max-w-md mx-auto relative p-6 font-mono">
      <Switch>
        <Match when={gameState() === 'start'}>
          <div class="flex flex-col h-full justify-between">
            <div class="px-6">
              <p class="text-[#969696]">// ready to play?</p>
              <p class="text-[#969696]">// give quick short answers...</p>
            </div>
            <Button
              onClick={startGame}
              class="!h-[52px] bg-orange hover:enabled:bg-orange/80 text-white w-full lowercase flex justify-center font-semibold text-xl"
            >
              Play
            </Button>
          </div>
        </Match>
        <Match when={gameState() === 'playing'}>
          <div class="flex flex-col h-full">
            <h2 class="text-gray-8 px-4">{currentQuestionIndex() + 1}/{props.questions.length}</h2>
            <p class="lowercase px-4">{currentQuestion().question}</p>
            <form onSubmit={handleSubmit} class="mt-6 h-full flex flex-col justify-between">
              <input
                required
                autocomplete="off"
                type="text"
                name="answer"
                placeholder="answer"
                class="bg-white bg-opacity-[12%] py-2 px-4 text-[#B7B7B7] focus:bg-[#220B00] focus:ring-1 focus:ring-inset focus:ring-[#FF5C00] outline-none focus:outline-none"
              />
              <Button
                type="submit"
                class="!h-[52px] bg-orange hover:enabled:bg-orange/80 text-white w-full lowercase flex justify-center font-semibold text-xl"
              >
                {isLastQuestion() ? 'Finish' : 'Next'}
              </Button>
            </form>
          </div>
        </Match>
        <Match when={gameState() === 'finished'}>
          <div class="h-[80vh] flex flex-col">
            <h2 class="text-gray-8 px-4 sticky top-0 bg-black py-2 z-10">Processing Results</h2>
            <div class="overflow-y-auto flex-grow">
              <For each={loadingText()}>
                {(line) =>
                  <div
                    class={line.highlight ? "whitespace-pre-wrap text-blue-11" : "whitespace-pre-wrap"}
                  >
                    {line.text}
                  </div>
                }
              </For>
            </div>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export default FeudQuiz;
