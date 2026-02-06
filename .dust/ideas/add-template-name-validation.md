# Add template name validation

Template commands use string names with no compile-time validation. A typo in a template name silently fails at runtime. A `TemplateName` union type derived from the actual template files would catch errors at build time.
