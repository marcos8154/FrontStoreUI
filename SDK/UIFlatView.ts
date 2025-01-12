import { BindingContext } from "./BindingContext";
import { Misc } from "./Misc";
import { PageShell } from "./PageShell";
import { ViewBuilder } from "./ViewBuilder";
import { ViewCache } from "./UIFlatViewCache";
import { UIPage } from "./UIPage";
import { UIView } from "./UIView";
import { ViewLayout } from "./ViewLayout";
import { WidgetBinderBehavior } from "./WidgetBinderBehavior";
import { DivContent } from "./yord-api/DivContent";
import { DefaultExceptionPage } from "./DefaultExceptionPage";

export abstract class UIFlatView extends UIView
{
    private static caches: ViewCache[] = [];

    private static findCached(path: string)
    {
        for (var c = 0; c < this.caches.length; c++)
        {
            const cached = this.caches[c];
            if (cached.path == path) return cached;
        }
        return null;
    }

    public static load(view: UIFlatView)
    {
        view.builder = view.buildView();

        const cached = this.findCached(view.builder.layoutPath);
        if (!Misc.isNull(cached))
        {
            view.builder.layoutHtml = cached.content;
            UIPage.shell.navigateToView(view)
        }
        else
            ViewLayout.load(view.builder.layoutPath, function (html: string)
            {
                if (Misc.isNullOrEmpty(html) || html.indexOf('<title>Error</title>') > -1)
                    throw new DefaultExceptionPage(new Error(`No html-layout found for '${view.builder.layoutPath}'`))

                view.builder.layoutHtml = html;
                UIPage.shell.navigateToView(view)
                UIFlatView.caches.push(new ViewCache(view.builder.layoutPath, html))
            });
    }

    private builder: ViewBuilder;
    private binding: BindingContext<any | object>;
    protected abstract buildView(): ViewBuilder;

    buildLayout(): ViewLayout
    {
        return new ViewLayout(this.builder.targetId).fromHTML(this.builder.layoutHtml)
    }
    composeView(): void
    {
        for (var c = 0; c < this.builder.viewContent.length; c++)
        {
            var content: DivContent = this.builder.viewContent[c];
            this.addWidgets(content.id, ...content.w);
        }
    }
    onViewDidLoad(): void
    {
        if (this.builder.hasBinding())
            this.binding = this.builder.getBinding(this);
        this.builder.callLoadFn(this.viewContext());
    }

    protected getViewModel<TViewModel>(callValidations: boolean = true): TViewModel
    {
        return this.binding.getViewModel<TViewModel>(callValidations);
    }

    protected setViewModel<TViewModel>(instance: TViewModel, updateUI: boolean = true): void
    {
        this.binding.setViewModel(instance, updateUI);
    }

    public getBindingFor(modelPropertyName: string): WidgetBinderBehavior
    {
        return this.binding.getBindingFor(modelPropertyName);
    }

    public getBindingContext<TViewModel>(): BindingContext<TViewModel>
    {
        return this.binding;
    }

    /**
     * Causes a UI refresh on all Widgets managed by this Data Binding Context
     * based on the current values of the properties/keys of the ViewModelType instance
     * 
     * (remember that the ViewModelType instance is managed by this context as well)
     */
    public bindingRefreshUI(): void
    {
        return this.getBindingContext().refreshAll();
    }
}