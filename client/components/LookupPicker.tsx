import { useDataverseApi } from "@/hooks/useDataverseApi";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TagPicker, ITag, IBasePickerSuggestionsProps } from "@fluentui/react";
import { toast } from "@/ui/use-toast";

interface LookupValue {
    displayField: string;
    secondaryField: string;
    keyField: string;
}

interface LookupPickerProps {
    label: string;
    tableName: string;
    displayField: string;
    secondaryField: string;
    keyField: string;
    searchField: string;
    maxSelection:number;
    cascadeField?: string;
    cascadeValue?: string;
    isDefaultSelected?: boolean;
    disabled?: boolean;
    onSelect: (selectedValues: LookupValue[]) => void;
    expandFields?: string
}

export const LookupPicker: React.FC<LookupPickerProps> = ({
    label,
    tableName,
    displayField,
    secondaryField,
    keyField,
    searchField,
    maxSelection,
    cascadeField,
    cascadeValue,
    isDefaultSelected=false,
    disabled,
    expandFields,
    onSelect,
}) => {
    const [selected, setSelected] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const recordCache = useRef<Map<string, any>>(new Map());
    const { callApi } = useDataverseApi();

    const pickerSuggestionsProps = useMemo<IBasePickerSuggestionsProps>(
        () => ({
            suggestionsHeaderText: `Search ${label}`,
            noResultsFoundText: "No results found",
            searchingText: loading ? "Searching..." : "",
        }),
        [label, loading]
    );

    const toTag = (record: any): ITag => ({
        key: String(record[keyField]),
        name: record[displayField] ?? String(record[keyField]),
    });

    const fetchData = async (text: string): Promise<ITag[]> => {
      setLoading(true);
      try {
        const select = `*,${keyField},${displayField},${secondaryField},${searchField}${cascadeField ? `,${cascadeField}` : ""}`;
        const filterParts = [] as string[];
        if (text && text.length >= 3) {
          filterParts.push(
            `contains(${searchField},'${encodeURIComponent(text)}')`,
          );
        }
        if (cascadeField && cascadeValue) {
          filterParts.push(
            `${cascadeField} eq '${encodeURIComponent(cascadeValue)}'`,
          );
        }
        const query = `/_api/${tableName}?$select=${select}${
          filterParts.length ? `&$filter=${filterParts.join(" and ")}` : ""
        }${expandFields ? `&$expand=${expandFields}` : ""}`;

        const res = await callApi<{ value: any }>({
          url: query,
          method: "GET",
        });
        const data = res.value || [];
        data.forEach((rec: any) => {
          recordCache.current.set(String(rec[keyField]), rec);
        });
        return data.map(toTag);
      } catch (err) {
        console.error("Error fetching lookup data:", err);
        return [];
      } finally {
        setLoading(false);
      }
    };

    const handleChange = (items?: ITag[]) => {
      const records = (items || [])
        .map((tag) => recordCache.current.get(String(tag.key)))
        .filter(Boolean);
      if (
        cascadeField &&
        cascadeValue &&
        isDefaultSelected &&
        records.length === 0
      ) {
        toast({
          title: "Warning",
          description: "Default selection enabled. Cannot remove selection.",
        });
        return;
      }
      setSelected(records);
      onSelect(records);
    };

    const onResolveSuggestions = async (
      filterText: string,
      selectedItems?: ITag[],
    ) => {
      const selectedKeys = new Set(
        (selectedItems || []).map((i) => String(i.key)),
      );
      const suggestions = await fetchData(filterText);
      return suggestions.filter((tag) => !selectedKeys.has(String(tag.key)));
    };

    const onItemSelected = (item?: ITag | null): ITag | null => {
      if (!item) return null;
      if (selected.length >= maxSelection) {
        toast({
          title: "Limit reached",
          description: `You can only select up to ${maxSelection} items.`,
        });
        return null;
      }
      return item;
    };

    // Default selection when cascade and default requested
    useEffect(() => {
      if (isDefaultSelected && cascadeValue && selected.length === 0) {
        // console.log("first");
        fetchData("").then((items) => {
          if (items.length > 0) {
            handleChange([items[0]]);
          }
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDefaultSelected, cascadeField, cascadeValue]);

    const selectedTags = useMemo<ITag[]>(
        () => selected.map(toTag),
        [selected]
    );

    return (
        <TagPicker
            onResolveSuggestions={onResolveSuggestions}
            onEmptyResolveSuggestions={(selectedItems) =>
                onResolveSuggestions("", selectedItems)
            }
            selectedItems={selectedTags}
            onChange={handleChange}
            pickerSuggestionsProps={pickerSuggestionsProps}
            inputProps={{
                placeholder: `Look for ${label}...`,
                disabled: selected.length >= maxSelection || disabled,
            }}
            disabled={disabled || selected.length >= maxSelection}
            itemLimit={maxSelection}
            onItemSelected={onItemSelected}
        />
    );
};


