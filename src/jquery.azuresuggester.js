

(function ($) {
    //Defaults - Local Settings
    var ls = {
        azureSearch: {
            url: "", // azure search request api endpoint
            key: "" // azure search request api key
        },
        searchParams: {
            search: "*",
            highlightPreTag: null, // wrap the suggester text in some html in the returned result
            highlightPostTag: null, // wrap the suggester text in some html in the returned result
            suggesterName: null, // name of suggester configured on azure
            fuzzy: false, // provide more suggestions using 'fuzzy' search
            searchFields: null, // fields to search (must be defined as 'SourceFields' for suggester on azure)
            select: 'pagename,nodealiaspath', // fields to return from the index
            top: null, // number of suggestions to return
            filter: null, // filter suggestions using odata filter syntax
            orderby: null, // // SUGGETER ONLY : order suggestion results
        },
        suggestions: {
            container: '#suggestions',
            template: null,
            classNames: '',
            onCreate: function () { },
            onClick: function () { }
        },
        onResults: processResults,
        onLoad: function () { },
        debug: false
    }

    
    var methods = {
        search: getSuggestions,
    }

    //Internal Parameters
    var local = {
        input: null,
        wrapper: null,
        suggestionList: null,
        initialized: false,
        combobox: null,

    }

    // 
    $.fn.azuresuggester = function (action, options) {

        local.input = this;

        if ($(local.input).length > 0 && !local.initialized) {

            var inputData = local.input.data();

            // set options based on data attributes
            if (inputData['azureSearchSuggesterFilter'])
                ls.searchParams.filter = inputData['azureSearchSuggesterFilter'];

            // Select suggster fields
            if (inputData['azureSearchSuggesterFields'])
                ls.searchParams.searchFields = inputData['azureSearchSuggesterFields'];

            // Select what index fields should be returned
            if (inputData['azureSearchSuggesterSelect'])
                ls.searchParams.select = inputData['azureSearchSuggesterSelect'];

            // Use fuzzy search
            if (inputData['azureSearchSuggesterFuzzy'])
                ls.searchParams.fuzzy = inputData['azureSearchSuggesterFuzzy'];

            // Select suggster
            if (inputData['azureSearchSuggester'])
                ls.searchParams.suggesterName = inputData['azureSearchSuggester'];

            // API Key
            if (inputData['azureSearchSuggesterApiKey'])
                ls.azureSearch.key = inputData['azureSearchSuggesterApiKey'];

            // Construct API Url
            if (inputData['azureSearchSuggesterApiEndpoint'] && inputData['azureSearchSuggesterType'] && inputData['azureSearchSuggesterApiVersion'])
                ls.azureSearch.url = inputData['azureSearchSuggesterApiEndpoint'] + inputData['azureSearchSuggesterType'] + '?api-version=' + inputData['azureSearchSuggesterApiVersion'];

            // API Key
            if (inputData['azureSearchSuggesterApiKey'])
                ls.azureSearch.key = inputData['azureSearchSuggesterApiKey'];

            

            //buildAutoComplete();
            setupListeners();

        } else {
            debug('you have not provided an input field');
            return false;
        }

        if (methods[action]) {

            return methods[action].apply(this, Array.prototype.slice.call(arguments, 1));

        }

        if (options && typeof options === 'object') {
            //Default options.
            if (param.azureSearch)
                param.azureSearch = $.extend(ls.azureSearch, param.azureSearch);
            if (param.searchParams)
                param.searchParams = $.extend(ls.searchParams, param.searchParams);
            if (param.results)
                param.results = $.extend(true, ls.results, param.results);

            ls = $.extend(ls, options);
        }

        local.initialized = true;

        return this;
    };
    
    /**
      * Handlers
      */

    function setupListeners() {

        if (aria.ListboxCombobox) {
            console.log('have aria combobox!');
            buildAutoComplete();

            local.combobox = new aria.ListboxCombobox(
                local.wrapper[0], // parent element
                local.input[0], // text input
                local.suggestionList[0], // list container for options
                function (t) {
                    var r_arr = [];
                    var results = getSuggestions(t).done(function (d, e) {
                        
                        if (e == 'success') {
                            $.each(d.value, function (k, v) {
                                r_arr.push(v.pagename);
                            });
                        }
                        return r_arr;
                    });
                    return results.then(function () {
                        console.log(r_arr);
                        return r_arr;
                    });
                    
                }, // search function
                true // auto select boolean
            );     
        }
        else if ($.fn.autocomplete) {
            console.log('have autocomplete!');
        }

    }

    function buildAutoComplete() {
        console.log('buildAutoComplete()');

        local.wrapper = $(local.input).parent().addClass('azure-suggestions-wrapper');
        local.suggestionList = $('<ul/>').addClass('azure-suggestions-list')
        local.suggestionList.appendTo(local.wrapper);

    }

    function processResults() {
        
        debug(this);
    }

    function checkHide(e) {
        if (e.target === local.input || local.suggestionList.contains(e.target)) {
            return;
        }
        this.hideListbox();
    }

    function hideListbox() {

    }

    /**
    * External API Calls
    */

    //Execute the AJAX call to Azure Search

    function getSuggestions(s) {

        if (s)
           ls.searchParams.search = s;

        var settings = {
            "crossDomain": true,
            "url": ls.azureSearch.url,
            "method": "POST",
            "headers": {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "api-key": ls.azureSearch.key,
                "Cache-Control": "no-cache",
            },
            "data": JSON.stringify(ls.searchParams)
        }

        return $.ajax(settings).done(function (response) {
            ls.onResults.call(response, local);
        });


    }



    // Log messages to console when debug enabled.
    function debug(obj) {
        if (ls.debug && window.console && window.console.log) {
            window.console.log(obj);
        }
    };


}(jQuery));
