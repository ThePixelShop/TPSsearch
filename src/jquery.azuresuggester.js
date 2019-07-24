

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
            select: '*', // fields to return from the index
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
    $.fn.azuresuggester = function (options) {

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

            //buildAutoComplete();
            setupListeners();

        } else {
            debug('you have not provided an input field');
            return false;
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

        if (typeof aria != 'undefined' && typeof aria.ListboxCombobox != 'undefined') {
            buildAutoComplete();
            local.combobox = new aria.ListboxCombobox(
                local.wrapper[0], // parent element
                local.input[0], // text input
                local.suggestionList[0], // list container for options
                function (t) {
                    // var r_arr;
                    // getSuggestions(t).then(function(d, s, jqXHR) {
                    //     r_arr = [];
                    //     $.each(d.value, function (k, v) {
                    //         r_arr.push(v.documentname);
                    //     });
                    //     return r_arr;
                    // }, 
                    // function( jqXHR, s, err ) {
                    //     console.log(s);
                    //     return false;
                    // }); 

                    // var _int = setInterval(function() {
                    //     console.log(typeof r_arr);
                    //     console.log(r_arr);
                    //     if(typeof r_arr !== undefined && r_arr.length > 0) {
                    //         clearInterval(_int)
                    //         return r_arr;
                    //     } else if (r_arr === false) {
                    //         clearInterval(_int)
                    //         return [];
                    //     }
                    // }, 50);
                }, // search function
                false, // auto select boolean
                function() {

                },
                function() {

                },

            );     
        }
        else if ($.fn.autocomplete) {
            console.log('have autocomplete!');
            
            local.input.autocomplete({
                autofocus: true,
                appendTo: local.input.parent(),
                source : function(req, resp) {
                    getSuggestions(req.term).then(function(d){
                        var vals = [];
                        $.each(d.value,function(k,v) {
                            var obj = {};
                            obj['label'] = v.documentname;
                            // obj['value'] = v.nodealiaspath;
                            obj['foo'] = v.nodealiaspath;
                            vals.push(obj);
                        })
                        // console.log(d);
                        // console.log(vals);
                        resp(vals);
                    });

                },
                select: function(e,item) {
                    console.log(e);
                    console.log(item);
                }
            }).data('ui-autocomplete')._renderItem = function (ul, item) {
                
                return $( "<li>" ).append( item.label ).appendTo( ul );

                // var that = this;                
                // $.each(items, function (index, item) {
                //     that._renderItemData(ul, item);
                // });

            };

               
        }

    }

    function buildAutoComplete(classname) {

        local.wrapper = $(local.input).parent().addClass('azure-suggestions-wrapper');
        local.suggestionList = $('<ul/>').addClass('azure-suggestions-list')
        local.suggestionList.appendTo(local.wrapper);

    }

    function processResults() {
        
        debug(this);
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

        return $.ajax(settings).then(function(d){
            ls.onResults.call(d, local);
            return d;
        });

    }



    // Log messages to console when debug enabled.
    function debug(obj) {
        if (ls.debug && window.console && window.console.log) {
            window.console.log(obj);
        }
    };


}(jQuery));
