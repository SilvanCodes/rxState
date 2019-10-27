import { Subject, Observable } from 'rxjs';
import { scan, shareReplay, pluck, distinctUntilChanged, filter } from 'rxjs/operators';


/**
 * Simple, functional, reactive state with rxjs.
 *
 * setState:
 *      Update state with new value(s).
 *      Accepts partial of T or function computed from actual state values that returns partial of T.
 *
 * getState:
 *      Retrieve values from state.
 *      Accepts key(s) as strings that articulate path to value.
 *      If called with zero arguments it returns full state.
 *
 * Example:
 *      interface State {
 *          some: {
 *              value: number;
 *          }
 *      }
 *
 *      const initialState = { some: { value: 0 } };
 *      const { setState, getState } = setupState<State>(initialState);
 *
 *      getState('some', 'value').subscribe(console.log);
 *
 *      setState(state => state);
 *      setState(({ some: { value: last }}) => ({ some: { value: last + 1 } }));
 *
 *      // prints:
 *      // 0
 *      // 1
 *
 * Note:
 *      1. If you want to emit the initial state after setup just call: setState(state => state)
 *
 *      2. All getState('someKey') calls are automatically memoized, cached, multicasted and never null/undefined.
 *
 * @param initialState: some object according to type T
 * @param nullUndef : allow emmission on null or undefined values, default false
 */
function setupState<T>(initialState: T) {
    type UpdateFunction = (recentState: T) => Partial<T>;
    type StateUpdate = Partial<T> | UpdateFunction;
    type StateValue = T[keyof T] | T;

    function isFunction(update: StateUpdate): update is UpdateFunction {
        return Boolean((update as Function).apply)
    }
    
    // source of state changes
    const stateUpdate$ = new Subject<StateUpdate>();

    // interface for state mutation
    function setState(update: StateUpdate): void {
        stateUpdate$.next(update);
    }

    const state$: Observable<T> = stateUpdate$.pipe(
        // update
        scan(
            (state: T, update: StateUpdate) => ({
                ...state,
                ...(isFunction(update) ? update(state) : update)
            }),
            initialState
        ),
        // cache
        shareReplay(1)
    );

    // interface for state retrival
    function getState<R extends StateValue = T>(...path: Array<string>): Observable<R> {
        return Boolean(path.length)
            ? state$.pipe(
                pluck<T, R>(...path),
                distinctUntilChanged(),
                filter<R>((value: R) => value !== null && value !== undefined),
                shareReplay(1)
            )
            : state$ as Observable<R>;
    }

    return { setState, getState }
}


export { setupState };
