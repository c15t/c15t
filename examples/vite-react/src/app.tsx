import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/react';
import { useState } from 'react';
import viteLogo from '/vite.svg';
import reactLogo from './assets/react.svg';
import { c15tOptions } from './c15t-client';
function App() {
	const [count, setCount] = useState(0);

	return (
		<ConsentManagerProvider options={c15tOptions}>
			<div>
				<a href="https://vite.dev" target="_blank" rel="noreferrer">
					{/* biome-ignore lint/nursery/noImgElement: <explanation> */}
					<img src={viteLogo} className="logo" alt="Vite logo" />
				</a>
				<a href="https://react.dev" target="_blank" rel="noreferrer">
					{/* biome-ignore lint/nursery/noImgElement: <explanation> */}
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
			</div>
			<h1>Vite + React</h1>
			<div className="card">
				<button type="button" onClick={() => setCount((count) => count + 1)}>
					count is {count}
				</button>
				<p>
					Edit <code>src/App.tsx</code> and save to test HMR
				</p>
			</div>
			<p className="read-the-docs">
				Click on the Vite and React logos to learn more
			</p>
			<CookieBanner />
			<ConsentManagerDialog />
		</ConsentManagerProvider>
	);
}

export default App;
