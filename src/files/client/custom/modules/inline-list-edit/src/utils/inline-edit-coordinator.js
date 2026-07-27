/**
 * Serializes editor switches and guarantees that only one list field stays in
 * inline-edit mode. Opening another field cancels the previous unsaved edit;
 * clicking outside validates and saves the active field.
 */
export default class InlineEditCoordinator {

    activeView = null

    transition = Promise.resolve()

    sessionClassName = 'inline-list-edit-session-active'

    outsideInteractionSelector = [
        '.inline-list-edit-autocomplete',
        '.selectize-dropdown',
        '.autocomplete-suggestions',
        '.datepicker',
        '.ui-datepicker',
        '.timepicker',
        '.datetimepicker',
        '.flatpickr-calendar',
        '.iti--container',
        '.modal',
        '.modal-backdrop',
    ].join(', ')

    constructor(documentElement = document) {
        this.documentElement = documentElement;
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handleSuppressedClick =
            this.handleSuppressedClick.bind(this);
    }

    open(view, openCallback) {
        const switchEditor = async () => {
            if (
                this.activeView &&
                this.activeView !== view &&
                this.isOpen(this.activeView)
            ) {
                await this.activeView.inlineEditClose();
            }

            this.activeView = view;

            try {
                await openCallback();
            } catch (error) {
                this.release(view);

                throw error;
            }

            if (this.activeView === view && this.isOpen(view)) {
                this.setSessionActive(true);
                this.listenForOutsideInteraction();
            }
        };
        const result = this.transition.then(
            switchEditor,
            switchEditor
        );

        this.transition = result.catch(() => {});

        return result;
    }

    close(view) {
        const closeEditor = async () => {
            if (
                this.activeView !== view ||
                !this.isOpen(view)
            ) {
                return;
            }

            await view.inlineEditClose();
        };
        const result = this.transition.then(
            closeEditor,
            closeEditor
        );

        this.transition = result.catch(() => {});

        return result;
    }

    save(view) {
        if (
            this.activeView !== view ||
            !this.isOpen(view)
        ) {
            return;
        }

        const cell = view.$el?.get(0);
        const activeElement = this.documentElement?.activeElement;

        if (
            cell?.contains?.(activeElement) &&
            activeElement?.dispatchEvent
        ) {
            activeElement.dispatchEvent(
                new Event('change', {bubbles: true})
            );
        }

        view.fetchToModel?.();
        view.inlineEditSave();
    }

    release(view) {
        if (this.activeView === view) {
            this.activeView = null;
            this.setSessionActive(false);
            this.stopListeningForOutsideInteraction();
        }
    }

    isOpen(view) {
        const cell = view.$el?.get(0);

        return Boolean(
            view._isInlineEditMode &&
            view.$el?.is('td.cell') &&
            cell?.isConnected
        );
    }

    isInsideInteraction(view, target) {
        const cell = view.$el?.get(0);

        if (cell?.contains?.(target)) {
            return true;
        }

        return Boolean(
            target?.closest?.(this.outsideInteractionSelector)
        );
    }

    handlePointerDown(event) {
        const view = this.activeView;

        if (
            !view ||
            !this.isOpen(view) ||
            this.isInsideInteraction(view, event.target)
        ) {
            return;
        }

        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        event.stopPropagation?.();

        this.suppressNextClick();
        this.stopListeningForOutsideInteraction();

        try {
            this.save(view);
        } catch (error) {
            console.error(error);
        }

        queueMicrotask(() => {
            if (this.activeView === view && this.isOpen(view)) {
                this.listenForOutsideInteraction();
            }
        });
    }

    suppressNextClick() {
        this.stopSuppressingClick();
        this.documentElement?.addEventListener?.(
            'click',
            this.handleSuppressedClick,
            true
        );
        this.clickSuppressionTimer = setTimeout(
            () => this.stopSuppressingClick(),
            500
        );
    }

    handleSuppressedClick(event) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        event.stopPropagation?.();
        this.stopSuppressingClick();
    }

    stopSuppressingClick() {
        this.documentElement?.removeEventListener?.(
            'click',
            this.handleSuppressedClick,
            true
        );

        if (this.clickSuppressionTimer) {
            clearTimeout(this.clickSuppressionTimer);
            this.clickSuppressionTimer = null;
        }
    }

    listenForOutsideInteraction() {
        this.stopListeningForOutsideInteraction();
        this.documentElement?.addEventListener?.(
            'pointerdown',
            this.handlePointerDown,
            true
        );
    }

    stopListeningForOutsideInteraction() {
        this.documentElement?.removeEventListener?.(
            'pointerdown',
            this.handlePointerDown,
            true
        );
    }

    setSessionActive(active) {
        this.documentElement?.body?.classList?.toggle(
            this.sessionClassName,
            active
        );
    }
}
