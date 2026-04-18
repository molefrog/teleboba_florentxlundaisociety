import { Agentation } from "agentation";
import { Route, Switch } from "wouter";
import { Welcome } from "./Welcome";
import { Teleprompter } from "./Teleprompter";
import { Playground } from "./Playground";

export function App() {
  return (
    <>
      <Switch>
        <Route path="/prompter" component={Teleprompter} />
        <Route path="/playground" component={Playground} />
        <Route path="/" component={Welcome} />
        <Route>
          <div className="grid min-h-screen place-items-center bg-bg italic text-mute">
            404 —{" "}
            <a href="/" className="ml-1 underline hover:text-fg">
              home
            </a>
          </div>
        </Route>
      </Switch>
      {import.meta.env.DEV && <Agentation />}
    </>
  );
}
