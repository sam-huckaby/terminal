import { Match, Switch, createSignal, onMount, onCleanup, createContext, useContext, type Component, type ParentProps } from 'solid-js'

// Create a context to coordinate the staggered animations
type AnimationContextType = { registerEvent: (id: string) => number }
const AnimationContext = createContext<AnimationContextType>()

type LaunchWeekProps = {
} & ParentProps

const LaunchWeek: Component<LaunchWeekProps> = ({ children }) => {
  // Counter to keep track of event item order
  const [eventCounter, setEventCounter] = createSignal(0)

  // Function to register event items in the order they appear
  const registerEvent = (_id: string) => {
    // We don't actually need to use the id, just tracking position
    const position = eventCounter()
    setEventCounter(c => c + 1)
    return position
  }

  return (
    <AnimationContext.Provider value={{ registerEvent }}>
      <div class="bg-black h-[calc(100vh-40px)] overflow-hidden" style={{
        "background-image": "linear-gradient(#180800 4px, transparent 4px);",
        "background-size": "8px 8px;"
      }}>
        {/* Main content */}
        <div class="relative flex flex-col mx-auto max-w-[720px] my-6 sm:my-12 md:my-[60px]">
          <div class="flex flex-col justify-center px-5 sm:px-8 md:px-0">
            {/* Title section */}
            <div class="text-white flex justify-center md:justify-between items-center gap-10 mb-10 sm:mb-11 md:mb-12">
              <h1 class="text-[24px] sm:text-[48px] md:text-[74px] font-medium tracking-[-1.48px] leading-[180%]">
                launch week
              </h1>
              <div class="border-2 border-white rounded-lg sm:rounded-xl md:rounded-2xl px-4 sm:px-6 md:px-8">
                <span class="text-lg sm:text-[28px] md:text-[40px] tracking-[-0.8px] leading-[180%]">24.03</span>
              </div>
            </div>

            {/* Events list */}
            <div class="flex flex-col gap-6">
              <EventItem
                date="24.03"
                title="beyond the terminal"
                keyword="api"
                href="/api"
                videoHref="https://x.com/terminaldotshop/status/1904190987255107954"
              />
              <EventItem
                date="25.03"
                title="shortcuts to happiness"
                keyword="raycast extension"
                href="https://ray.so/coffee"
                videoHref="https://x.com/terminaldotshop/status/1904611437583942126"
              />
              <EventItem
                date="26.03"
                title="thinking inside the box"
                keyword="cron membership"
                href="/cron"
                videoHref="https://x.com/terminaldotshop/status/1904888978911772812"
              />
              <EventItem
                date="27.03"
                title="scaling productivity"
                keyword="enterprise"
                href="/trust"
                videoHref="https://x.com/terminaldotshop/status/1905257122889122184"
              />
              <EventItem
                date="28.03"
                title="a brighter future"
                keyword="rebrand"
                videoHref="https://x.com/terminaldotshop/status/1905626850555994193"
              />
            </div>
          </div>

          {/* Team image with gradient overlay */}
          <div class="pointer-events-none -mx-20 md:-mx-36 fixed bottom-40 sm:bottom-32 md:bottom-24 mix-blend-screen">
            {children}
          </div>

          {/* Footer */}
          <div class="w-full flex flex-col items-center fixed bottom-16 inset-x-0">
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 32" fill="none" class="h-8">
                <g clip-path="url(#clip)">
                  <path d="M69.1938 22.6103V25.0423H57.1971V22.6103H62.2099V13.7691H57.6227V11.3371H64.9067V22.6057H69.1938V22.6103ZM64.9067 9.44912V6.68341H62.0621V9.44912H64.9067ZM110.443 25.0377V22.6057H106.053V10.6605C106.053 9.34855 105.704 8.36112 105.005 7.68912C104.324 7.01712 103.316 6.67883 101.985 6.67883H98.8943V9.11083H101.985C102.469 9.11083 102.823 9.23883 103.056 9.4994C103.289 9.75997 103.405 10.144 103.405 10.6605V22.6057H98.5181V25.0377H110.443ZM93.7203 23.072C93.3529 23.7943 92.8378 24.3565 92.1748 24.7543C91.5118 25.152 90.7054 25.3485 89.7557 25.3485C88.591 25.3485 87.601 25.0377 86.7901 24.416C85.9927 23.7805 85.3835 22.9165 84.9714 21.8331C84.5727 20.7451 84.3711 19.5337 84.3711 18.1897C84.3711 16.8457 84.5727 15.6297 84.9714 14.5463C85.388 13.4583 85.9927 12.608 86.7901 11.9863C87.6054 11.3508 88.5955 11.0308 89.7557 11.0308C90.6516 11.0308 91.4267 11.2183 92.0762 11.5977C92.7258 11.9588 93.2499 12.4937 93.6486 13.2023V11.3417H96.2916V25.0423H93.7964L93.7203 23.072ZM92.3719 14.1028C91.8746 13.6731 91.2564 13.4583 90.5262 13.4583C89.4108 13.4583 88.5731 13.9063 88.0086 14.8023C87.4621 15.68 87.1843 16.8091 87.1843 18.1897C87.1843 19.5337 87.4576 20.6445 88.0086 21.5223C88.5731 22.4 89.4152 22.8388 90.5262 22.8388C91.2564 22.8388 91.8746 22.6331 92.3719 22.2171C92.8691 21.7874 93.2365 21.216 93.4694 20.512C93.7203 19.8034 93.8412 19.0308 93.8412 18.1851C93.8412 17.3257 93.7158 16.5394 93.4694 15.8308C93.2365 15.1131 92.8736 14.5325 92.3719 14.1028ZM71.4516 11.3371V25.0377H74.1215V16.8685C74.1215 15.712 74.3813 14.8343 74.8965 14.2308C75.4116 13.6091 76.1284 13.2983 77.0423 13.2983C77.8889 13.2983 78.5071 13.6 78.8879 14.2034C79.2866 14.7885 79.4882 15.6754 79.4882 16.864V25.0331H82.1312V16.2194C82.1312 14.6514 81.7594 13.3943 81.0113 12.4434C80.2811 11.4971 79.2149 11.0217 77.8173 11.0217C76.7197 11.0217 75.7969 11.36 75.0488 12.032C74.5963 12.4388 74.2424 12.96 73.9916 13.6L73.902 11.3371H71.4516ZM41.751 11.3371V25.0377H44.394V16.5348C44.394 15.8263 44.4433 15.232 44.5419 14.752C44.6404 14.2674 44.7927 13.9063 44.9898 13.6685C45.2049 13.4263 45.4557 13.3074 45.738 13.3074C46.2038 13.3074 46.5264 13.5588 46.7101 14.0571C46.9116 14.5417 47.0102 15.3691 47.0102 16.5394V25.0423H49.6532V16.5394C49.6532 15.8308 49.7025 15.2365 49.8011 14.7565C49.9175 14.272 50.0833 13.9108 50.2983 13.6731C50.5313 13.4308 50.8045 13.312 51.1226 13.312C51.5571 13.312 51.8528 13.5634 52.0185 14.0617C52.2022 14.5463 52.2918 15.3737 52.2918 16.544V25.0468H54.9348V16.544C54.9348 14.6834 54.684 13.3028 54.1867 12.4068C53.7029 11.4925 52.9637 11.0354 51.9692 11.0354C51.3063 11.0354 50.7328 11.2503 50.249 11.68C49.7831 12.1097 49.4248 12.7131 49.1784 13.4903C48.9768 12.6445 48.6901 12.0274 48.3048 11.6297C47.9241 11.232 47.4313 11.0354 46.8355 11.0354C45.5722 11.0354 44.6807 11.7668 44.1656 13.2343L44.0894 11.3463H41.751V11.3371ZM33.5083 13.9383L33.3291 11.3371H28.1416V13.7691H31.4835V22.6103H28.1416V25.0423H38.2927V22.6103H34.1758V17.0285C34.1758 16.288 34.2654 15.6845 34.4491 15.2183C34.6506 14.7337 34.9553 14.3725 35.3719 14.1303C35.7885 13.888 36.3216 13.7691 36.9667 13.7691H39.5111V11.3371H36.792C35.793 11.3371 35.0135 11.6114 34.4491 12.1645C34.0235 12.5851 33.7099 13.1748 33.5083 13.9383ZM14.4964 21.9611C15.0115 23.0491 15.7328 23.8811 16.6646 24.4708C17.5963 25.056 18.6849 25.3485 19.9303 25.3485C21.2921 25.3485 22.4972 24.9508 23.5454 24.16C24.6116 23.3691 25.3239 22.3177 25.6912 21.0057L22.8735 20.7223C22.6091 21.3943 22.2105 21.92 21.6774 22.2994C21.1622 22.6605 20.5798 22.8434 19.9303 22.8434C18.9671 22.8434 18.1921 22.5005 17.6098 21.8103C17.0274 21.12 16.687 20.1554 16.5884 18.9165H25.9152L25.8883 18.0388C25.839 16.4708 25.5389 15.1588 24.9924 14.1074C24.4458 13.056 23.7291 12.2788 22.8466 11.7805C21.9641 11.2823 20.992 11.0308 19.9303 11.0308C18.6849 11.0308 17.5963 11.3234 16.6646 11.9085C15.7328 12.4937 15.0115 13.3303 14.4964 14.4183C13.9812 15.5017 13.7214 16.7634 13.7214 18.1943C13.7214 19.6251 13.9812 20.8777 14.4964 21.9611ZM16.6422 16.8685C16.8258 15.7988 17.1976 14.9805 17.7666 14.4137C18.331 13.8285 19.0567 13.536 19.9348 13.536C20.7142 13.536 21.3817 13.8103 21.9282 14.3634C22.4748 14.8983 22.8331 15.7348 22.9989 16.8731H16.6422V16.8685ZM6.39703 11.3371V7.71655H3.72712V11.3371H0.0134277V13.7691H3.72712V20.9554C3.72712 22.2674 4.05862 23.2731 4.7261 23.9817C5.40702 24.6903 6.44631 25.0423 7.84398 25.0423H11.4367V22.6103H8.12173C7.5752 22.6103 7.14963 22.4457 6.84949 22.1211C6.54934 21.792 6.40151 21.3348 6.40151 20.7497V13.7691H11.4905V11.3371H6.39703Z" fill="white" />
                  <path d="M69.1938 22.6103V25.0423H57.1971V22.6103H62.2099V13.7691H57.6227V11.3371H64.9067V22.6057H69.1938V22.6103ZM64.9067 9.44912V6.68341H62.0621V9.44912H64.9067ZM110.443 25.0377V22.6057H106.053V10.6605C106.053 9.34855 105.704 8.36112 105.005 7.68912C104.324 7.01712 103.316 6.67883 101.985 6.67883H98.8943V9.11083H101.985C102.469 9.11083 102.823 9.23883 103.056 9.4994C103.289 9.75997 103.405 10.144 103.405 10.6605V22.6057H98.5181V25.0377H110.443ZM93.7203 23.072C93.3529 23.7943 92.8378 24.3565 92.1748 24.7543C91.5118 25.152 90.7054 25.3485 89.7557 25.3485C88.591 25.3485 87.601 25.0377 86.7901 24.416C85.9927 23.7805 85.3835 22.9165 84.9714 21.8331C84.5727 20.7451 84.3711 19.5337 84.3711 18.1897C84.3711 16.8457 84.5727 15.6297 84.9714 14.5463C85.388 13.4583 85.9927 12.608 86.7901 11.9863C87.6054 11.3508 88.5955 11.0308 89.7557 11.0308C90.6516 11.0308 91.4267 11.2183 92.0762 11.5977C92.7258 11.9588 93.2499 12.4937 93.6486 13.2023V11.3417H96.2916V25.0423H93.7964L93.7203 23.072ZM92.3719 14.1028C91.8746 13.6731 91.2564 13.4583 90.5262 13.4583C89.4108 13.4583 88.5731 13.9063 88.0086 14.8023C87.4621 15.68 87.1843 16.8091 87.1843 18.1897C87.1843 19.5337 87.4576 20.6445 88.0086 21.5223C88.5731 22.4 89.4152 22.8388 90.5262 22.8388C91.2564 22.8388 91.8746 22.6331 92.3719 22.2171C92.8691 21.7874 93.2365 21.216 93.4694 20.512C93.7203 19.8034 93.8412 19.0308 93.8412 18.1851C93.8412 17.3257 93.7158 16.5394 93.4694 15.8308C93.2365 15.1131 92.8736 14.5325 92.3719 14.1028ZM71.4516 11.3371V25.0377H74.1215V16.8685C74.1215 15.712 74.3813 14.8343 74.8965 14.2308C75.4116 13.6091 76.1284 13.2983 77.0423 13.2983C77.8889 13.2983 78.5071 13.6 78.8879 14.2034C79.2866 14.7885 79.4882 15.6754 79.4882 16.864V25.0331H82.1312V16.2194C82.1312 14.6514 81.7594 13.3943 81.0113 12.4434C80.2811 11.4971 79.2149 11.0217 77.8173 11.0217C76.7197 11.0217 75.7969 11.36 75.0488 12.032C74.5963 12.4388 74.2424 12.96 73.9916 13.6L73.902 11.3371H71.4516ZM41.751 11.3371V25.0377H44.394V16.5348C44.394 15.8263 44.4433 15.232 44.5419 14.752C44.6404 14.2674 44.7927 13.9063 44.9898 13.6685C45.2049 13.4263 45.4557 13.3074 45.738 13.3074C46.2038 13.3074 46.5264 13.5588 46.7101 14.0571C46.9116 14.5417 47.0102 15.3691 47.0102 16.5394V25.0423H49.6532V16.5394C49.6532 15.8308 49.7025 15.2365 49.8011 14.7565C49.9175 14.272 50.0833 13.9108 50.2983 13.6731C50.5313 13.4308 50.8045 13.312 51.1226 13.312C51.5571 13.312 51.8528 13.5634 52.0185 14.0617C52.2022 14.5463 52.2918 15.3737 52.2918 16.544V25.0468H54.9348V16.544C54.9348 14.6834 54.684 13.3028 54.1867 12.4068C53.7029 11.4925 52.9637 11.0354 51.9692 11.0354C51.3063 11.0354 50.7328 11.2503 50.249 11.68C49.7831 12.1097 49.4248 12.7131 49.1784 13.4903C48.9768 12.6445 48.6901 12.0274 48.3048 11.6297C47.9241 11.232 47.4313 11.0354 46.8355 11.0354C45.5722 11.0354 44.6807 11.7668 44.1656 13.2343L44.0894 11.3463H41.751V11.3371ZM33.5083 13.9383L33.3291 11.3371H28.1416V13.7691H31.4835V22.6103H28.1416V25.0423H38.2927V22.6103H34.1758V17.0285C34.1758 16.288 34.2654 15.6845 34.4491 15.2183C34.6506 14.7337 34.9553 14.3725 35.3719 14.1303C35.7885 13.888 36.3216 13.7691 36.9667 13.7691H39.5111V11.3371H36.792C35.793 11.3371 35.0135 11.6114 34.4491 12.1645C34.0235 12.5851 33.7099 13.1748 33.5083 13.9383ZM14.4964 21.9611C15.0115 23.0491 15.7328 23.8811 16.6646 24.4708C17.5963 25.056 18.6849 25.3485 19.9303 25.3485C21.2921 25.3485 22.4972 24.9508 23.5454 24.16C24.6116 23.3691 25.3239 22.3177 25.6912 21.0057L22.8735 20.7223C22.6091 21.3943 22.2105 21.92 21.6774 22.2994C21.1622 22.6605 20.5798 22.8434 19.9303 22.8434C18.9671 22.8434 18.1921 22.5005 17.6098 21.8103C17.0274 21.12 16.687 20.1554 16.5884 18.9165H25.9152L25.8883 18.0388C25.839 16.4708 25.5389 15.1588 24.9924 14.1074C24.4458 13.056 23.7291 12.2788 22.8466 11.7805C21.9641 11.2823 20.992 11.0308 19.9303 11.0308C18.6849 11.0308 17.5963 11.3234 16.6646 11.9085C15.7328 12.4937 15.0115 13.3303 14.4964 14.4183C13.9812 15.5017 13.7214 16.7634 13.7214 18.1943C13.7214 19.6251 13.9812 20.8777 14.4964 21.9611ZM16.6422 16.8685C16.8258 15.7988 17.1976 14.9805 17.7666 14.4137C18.331 13.8285 19.0567 13.536 19.9348 13.536C20.7142 13.536 21.3817 13.8103 21.9282 14.3634C22.4748 14.8983 22.8331 15.7348 22.9989 16.8731H16.6422V16.8685ZM6.39703 11.3371V7.71655H3.72712V11.3371H0.0134277V13.7691H3.72712V20.9554C3.72712 22.2674 4.05862 23.2731 4.7261 23.9817C5.40702 24.6903 6.44631 25.0423 7.84398 25.0423H11.4367V22.6103H8.12173C7.5752 22.6103 7.14963 22.4457 6.84949 22.1211C6.54934 21.792 6.40151 21.3348 6.40151 20.7497V13.7691H11.4905V11.3371H6.39703Z" fill="white" />
                  <path d="M129.392 0.0411377H114.918V31.936H129.392V0.0411377Z" fill="#FF5C00" />
                </g>
                <defs>
                  <clipPath id="clip">
                    <rect width="130" height="32" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </div>
            <p class="text-xs text-center text-[#9C9C9C] mt-5 leading-[150%]">
              Copyright © Terminal Products, Inc. 1985-2025
            </p>
          </div>
        </div>
      </div>
    </AnimationContext.Provider>
  )
}

// Possible characters for the animation
const chars = 'abcdefghijklmnopqrstuvwxyz#';

// Event item component
const EventItem: Component<{ date: string; time?: string; keyword?: string; title: string; videoHref?: string; href?: string }> = (props) => {
  const context = useContext(AnimationContext);
  const [animatedText, setAnimatedText] = createSignal(props.keyword ?? '###');
  const [isCompleted, setIsCompleted] = createSignal(false);

  // Generate a unique ID for this component
  const id = Math.random().toString(36).substring(2, 15);

  // Register this component to get its position in the list
  const position = context?.registerEvent(id) ?? 0;

  // Set up animation for character placeholders
  onMount(() => {
    // Target text is either the keyword or '###'
    const targetText = props.keyword ?? '###';
    const maxLen = targetText.length;

    // Track which positions are locked to their final character
    const lockedPositions = Array(maxLen).fill(false);

    // Always start with a random animation, even if there's a keyword
    setAnimatedText(Array(maxLen).fill('').map(() =>
      chars[Math.floor(Math.random() * chars.length)]).join(''));

    // Animate each character with progressive locking to its final value
    const animationInterval = setInterval(() => {
      if (isCompleted()) return;

      setAnimatedText(_prev => {
        let result = '';

        for (let i = 0; i < maxLen; i++) {
          // If this position is already locked, keep its value
          if (lockedPositions[i]) {
            result += targetText[i];
            continue;
          }

          // 5% chance to lock if character randomly matches the target
          const randomChar = chars[Math.floor(Math.random() * chars.length)];
          if (randomChar === targetText[i] || Math.random() < 0.03) {
            lockedPositions[i] = true;
            result += targetText[i];
          } else {
            // Otherwise show a random character
            result += randomChar;
          }
        }

        // Check if all positions are locked
        if (lockedPositions.every(locked => locked)) {
          setIsCompleted(true);
        }

        return result;
      });
    }, 80);

    // Set a timeout to force completion after staggered delay based on position
    const staggerDelay = 2000 + (position * 800); // 2 seconds base + 0.8s per position

    const completionTimeout = setTimeout(() => {
      setIsCompleted(true);
      clearInterval(animationInterval);

      // Set text to final value after slight delay
      setTimeout(() => {
        setAnimatedText(targetText);
      }, 500);
    }, staggerDelay);

    // Clean up on unmount
    onCleanup(() => {
      clearInterval(animationInterval);
      clearTimeout(completionTimeout);
    });
  });

  const timeOrLink = () => (
    <Switch>
      <Match when={props.videoHref}>
        <a href={props.videoHref} target="_blank" class="flex items-center gap-2 hover:text-white transition-colors duration-300 group/launch-item">
          <span class="tracking-[-0.36px]">watch</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none"
            class="size-5 stroke-current transition-all duration-300 ease-out group-hover/launch-item:translate-x-0.5 group-hover/launch-item:-translate-y-0.5">
            <path d="M15.2083 12.7083V4.79166H7.29167M5 15L14.6668 5.33318" stroke-width="1.5" stroke-linecap="square" />
          </svg>
        </a>
      </Match>
      <Match when={!props.videoHref}>
        <span class="md:hidden">{props.time ?? "1pm edt"}</span>
        <span class="hidden md:block">{props.time ?? "1.00pm edt"}</span>
      </Match>
    </Switch>

  )

  return (
    <div class="flex flex-col sm:flex-row gap-2 sm:gap-5 md:gap-8 text-[#9C9C9C] text-sm sm:text-base md:text-lg font-medium">
      <div class="flex w-full sm:w-auto items-center justify-between">
        <span class="tracking-[-0.36px]">
          {props.date}
        </span>
        <div class="sm:hidden">
          {timeOrLink()}
        </div>
      </div>
      <div class="flex sm:flex-1 items-center gap-2 whitespace-nowrap">
        <Switch>
          <Match when={props.href}>
            <a href={props.href} target="_blank" class="hover:text-white transition-colors duration-300 group/href-item">
              <span classList={{
                "tracking-[-0.36px]": true,
                'text-orange': !!props.keyword,
                'transition-all duration-300': true,
              }}>
                {animatedText()}
              </span>
            </a>
          </Match>
          <Match when={!props.href}>
            <span classList={{
              "tracking-[-0.36px]": true,
              'text-orange': !!props.keyword,
              'transition-all duration-300': true,
            }}>
              {animatedText()}
            </span>
          </Match>
        </Switch>
        <span class="text-white tracking-[-0.36px]">
          {props.title}
        </span>
      </div>
      <div class="hidden sm:block">
        {timeOrLink()}
      </div>
    </div>
  )
}

export default LaunchWeek
