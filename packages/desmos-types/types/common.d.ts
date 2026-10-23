/**
 * Shared primitive types and the observable-property mechanism used throughout
 * the Desmos API.
 */
declare namespace Desmos {
  /**
   * A LaTeX string in Desmos syntax, e.g. `'y=x^2'` or `'\\sin(x)'`.
   *
   * Remember that backslashes must be escaped in ordinary JS strings
   * (`'\\pi'`), or use `String.raw` (`` String.raw`\pi` ``).
   */
  type Latex = string;

  /** A CSS hex color such as `'#c74440'`. */
  type HexColor = string;

  /** A value that may be given either as a number or as LaTeX that evaluates to a number. */
  type NumberOrLatex = number | Latex;

  /**
   * Identifier of an item in the expressions list. Should be a valid JS
   * property name (letters, numbers and `_`).
   */
  type ExpressionId = string;

  /**
   * Language codes documented for v1.13. Translations must be requested when
   * loading `calculator.js` (via the `lang` URL parameter) before they can be used;
   * check {@link Desmos.supportedLanguages} at runtime.
   */
  type LanguageCode =
    | 'de'
    | 'en'
    | 'es'
    | 'et'
    | 'fr'
    | 'id'
    | 'it'
    | 'ja'
    | 'ko'
    | 'nl'
    | 'pl'
    | 'pt-BR'
    | 'ru'
    | 'sv-SE'
    | 'th'
    | 'tr'
    | 'vi'
    | 'zh-CN'
    | 'zh-TW'
    // Allow codes added in future patch releases while keeping autocompletion.
    | (string & {});

  /** Braille code used for input and output on refreshable Braille displays. */
  type BrailleMode = 'nemeth' | 'ueb' | 'none';

  // ---------------------------------------------------------------------------
  // Observables
  // ---------------------------------------------------------------------------

  /**
   * A property name accepted by `observe`/`unobserve`, optionally namespaced
   * (`'xAxisLabel.myObserver'`) so individual observers can be removed.
   */
  type ObservableProperty<Props> =
    | Extract<keyof Props, string>
    | `${Extract<keyof Props, string>}.${string}`;

  /**
   * Called when an observed property changes. Receives the (un-namespaced)
   * property name and the object that owns the property.
   */
  type ObserverCallback<Owner, Props> = (
    propertyName: Extract<keyof Props, string>,
    owner: Owner
  ) => void;

  /**
   * An object whose properties can be observed for changes. See
   * "Managing Observers" in the Desmos docs.
   *
   * @typeParam Props - the observable properties and their value types.
   */
  interface Observable<Props> {
    /**
     * Register `callback` to run whenever `property` changes. Several
     * observers may be added to one property. Namespace the property
     * (`'prop.name'`) to be able to remove a single observer later.
     */
    observe(property: ObservableProperty<Props>, callback: ObserverCallback<this, Props>): void;

    /**
     * Remove observers. `'prop'` removes every observer of `prop`;
     * `'prop.name'` removes only the observer registered with that namespace.
     */
    unobserve(property: ObservableProperty<Props>): void;
  }

  /**
   * An event name accepted by `observeEvent`/`unobserveEvent`, optionally
   * namespaced (`'change.autosave'`).
   */
  type EventName<Name extends string> = Name | `${Name}.${string}`;
}
