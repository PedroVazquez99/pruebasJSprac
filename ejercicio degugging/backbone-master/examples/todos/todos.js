// An example Backbone application contributed by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses a simple
// [LocalStorage adapter](backbone-localstorage.html)
// to persist Backbone models within your browser.

// Load the application once the DOM is ready, using `jQuery.ready`:
$(function(){

  // Todo Model
  // ----------

  // Our basic **Todo** model has `title`, `order`, and `done` attributes.
  var Todo = Backbone.Model.extend({
  
    // Default attributes for the todo item.
    defaults: function() {
      return {
        title: "empty todo...",
        order: Todos.nextOrder(),
        done: false
      };
    },

    // Ensure that each todo created has `title`.
    initialize: function() {
      if (!this.get("title")) {
        this.set({"title": this.defaults().title});
      }
    },

    // Toggle the `done` state of this todo item.
    toggle: function() {
      this.save({done: !this.get("done")});
    }

  });

  // Todo Collection
  // ---------------

  // The collection of todos is backed by *localStorage* instead of a remote
  // server.
  var TodoList = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Todo,

    // Save all of the todo items under the `"todos-backbone"` namespace.
    localStorage: new Backbone.LocalStorage("todos-backbone"),

    // Filter down the list of all todo items that are finished.
    done: function() {
      return this.filter(function(todo){ return todo.get('done'); });
    },

    // Filter down the list to only todo items that are still not finished.
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    // Todos are sorted by their original insertion order.
    comparator: function(todo) {
      return todo.get('order');
    }

  });

  // Create our global collection of **Todos**.
  var Todos = new TodoList;

  // Todo Item View
  // --------------

  // The DOM element for a todo item...
  var TodoView = Backbone.View.extend({

    //... is a list tag.
    tagName:  "li",
	// items: [], // este array no se limpiaba puesto que todas las instancias lo comparten
	
    // Cache the template function for a single item.
    template: _.template($('#item-template').html()),

    // The DOM events specific to an item.
    events: {
      "click .toggle"   : "toggleDone",
      "dblclick .view"  : "edit",
      "click a.destroy" : "destroy",
      "click a.clear"   : "clear",
      "keypress .edit"  : "updateOnEnter",
      "blur .edit"      : "close"
    },

    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a **Todo** and a **TodoView** in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
      this.items = ["destroy", "clear"]; // Se inicializa el  array en local 
    },

    // Re-render the titles of the todo item.
    render: function() {
      var position = this.model.collection.indexOf(this.model);
      var json = _.extend(this.model.toJSON(), { number: (position != null) ? position : "?" });
      this.$el.html(this.template(json));
      this.$el.toggleClass('done', this.model.get('done'));
      this.input = this.$('.edit');
      var self = this;
      self.$el.find("div.view").empty();
      
      _.each(this.items, function(value) {
          var li = $("<li></li>");
          var a = $("<a href='#'></a>").addClass(value);
          a.text(value[0]);
          a.attr("title", value);
          self.$el.find("div.view").append(a);
      });
      return this;
    },

    // Toggle the `"done"` state of the model.
    toggleDone: function() {
      this.model.toggle();
    },

    // Switch this view into `"editing"` mode, displaying the input field.
    edit: function() {
      this.$el.addClass("editing");
      this.input.focus();
    },

    // Close the `"editing"` mode, saving changes to the todo.
    close: function() {
      var value = this.input.val();
      if (!value) {
        this.clear();
      } else {
        this.model.save({title: value});
        this.$el.removeClass("editing");
      }
    },

    // If you hit `enter`, we're through editing the item.
    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    // Remove the item, destroy the model.
    destroy: function() {
      this.model.destroy();
    },
	
	clear: function() {
      this.model.save({title: ""});
    }

  });
  
  var PendingItems = Backbone.View.extend({
		el: $("#activeList"),
		template: _.template($('#active-template').html()),
		initialize: function() {
		  this.listenTo(Todos, 'add', this.render);
		  this.listenTo(Todos, 'remove', this.render);
		  this.listenTo(Todos, 'all', this.render);
		},
		
		render: function() {
			this.$el.find(".active-list").empty();
			var pending = Todos.where({done: false});
			var self = this;
			if(pending.length !== "0"){
				_.each(Todos.models, function(model){
					if(!model.get("done")){
						self.$el.find(".active-list").append(self.template({text:model.get("title")}));
					}
				});
			}else{
				this.$el.append(this.template({text:"There are no pending tasks."}));
			}
		return this;
    }
		
  });
  
    var DoneItems = Backbone.View.extend({
		el: $("#doneList"),
		template: _.template($('#done-template').html()),
		initialize: function() {
		  this.listenTo(Todos, 'add', this.render);
		  this.listenTo(Todos, 'remove', this.render);
		  this.listenTo(Todos, 'all', this.render);
		},
		
		render: function() {
      this.$el.find(".done-list").empty();
      var doneItems = Todos.where({done: true});
      var self = this; // Asegura que el bind sea sobre doneItems
      if(doneItems.length !== 0){
          _.each(doneItems, function(model){
              self.$el.find(".done-list").append(self.template({ text: model.get("title") }));
          });
      } else {
        this.$el.find(".done-list").append(this.template({ text:"There are no done tasks." })); // Busca la lista y añade directamente 
      }
      return this;
  }
		
  });

  // The Application
  // ---------------

  // Our overall **AppView** is the top-level piece of UI.
  var AppView = Backbone.View.extend({

    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#todoapp"),

    // Our template for the line of statistics at the bottom of the app.
    statsTemplate: _.template($('#stats-template').html()),

    // Delegated events for creating new items, and clearing completed ones.
    events: {
      "keypress #new-todo":  "createOnEnter",
      "click #clear-completed": "clearCompleted",
      "click #toggle-all": "toggleAllComplete"
    },

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved in *localStorage*.
    initialize: function() {

      this.input = this.$("#new-todo");
      this.allCheckbox = this.$("#toggle-all")[0];

      this.listenTo(Todos, 'add', this.addOne);
      this.listenTo(Todos, 'reset', this.addAll);
      this.listenTo(Todos, 'all', this.render);

      this.footer = this.$('footer');
      this.main = $('#main');

      Todos.fetch();
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {
      var done = Todos.done().length;
      var remaining = Todos.remaining().length;
	  var activeList = new PendingItems();
	  var doneList = new DoneItems();
      if (Todos.length) {
        this.main.show();
        this.footer.show();
        this.footer.html(this.statsTemplate({done: done, remaining: remaining}));
      } else {
        this.main.hide();
        this.footer.hide();
      }

      this.allCheckbox.checked = !remaining;
    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(todo) {
      var view = new TodoView({model: todo});
      this.$("#todo-list").append(view.render().el);
    },

    // Add all items in the **Todos** collection at once.
    addAll: function() {
      Todos.each(this.addOne, this);
    },

    // If you hit return in the main input field, create new **Todo** model,
    // persisting it to *localStorage*.
    createOnEnter: function(e) {
      if (e.keyCode != 13) return;
      if (!this.input.val()) return;

      Todos.create({title: this.input.val()});
      this.input.val('');
    },

    // Clear all done todo items, destroying their models.
    clearCompleted: function() {
      _.invoke(Todos.done(), 'destroy');
      return false;
    },

    toggleAllComplete: function () {
      var done = this.allCheckbox.checked;
      Todos.each(function (todo) { todo.save({'done': done}); });
    }

  });

  // Finally, we kick things off by creating the **App**.
  var App = new AppView;

});
